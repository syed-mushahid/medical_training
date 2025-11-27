from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from utils import admin_or_instructor_required, student_required, get_current_user
from models import db
from config import Config
from sqlalchemy import text
from routes.ragflow_sessions import get_api_key_for_user, check_student_chat_access, get_ragflow_headers
from routes.ragflow_completions import RAGFLOW_BASE_URL
import requests
import json
import openai

evaluations_bp = Blueprint('evaluations', __name__)

def get_openai_client():
    """Get OpenAI client - handles proxy-related initialization issues"""
    if not Config.OPENAI_API_KEY:
        raise ValueError('OpenAI API key is not configured')
    
    # Some OpenAI library versions have issues with proxy environment variables
    # We'll initialize the client with explicit parameters to avoid 'proxies' argument errors
    import os
    
    # Save and temporarily remove proxy env vars to prevent conflicts
    proxy_vars = {}
    proxy_keys = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
    for key in proxy_keys:
        if key in os.environ:
            proxy_vars[key] = os.environ.pop(key)
    
    try:
        # Initialize client with only api_key parameter
        # This avoids any proxy-related initialization issues
        client = openai.OpenAI(api_key=Config.OPENAI_API_KEY)
        return client
    except TypeError as e:
        # If there's still an issue, try with explicit timeout and no proxies
        if 'proxies' in str(e).lower():
            # Create client without any proxy configuration
            client = openai.OpenAI(
                api_key=Config.OPENAI_API_KEY,
                timeout=60.0
            )
            return client
        raise
    finally:
        # Restore proxy env vars if they were set
        for key, value in proxy_vars.items():
            os.environ[key] = value

@evaluations_bp.route('/chats/<chat_id>/sessions/<session_id>/evaluate', methods=['POST'])
@jwt_required()
def generate_evaluation(chat_id, session_id):
    """Generate an evaluation report for a session"""
    try:
        current_user = get_current_user()
        
        # Check access - students can only evaluate their own sessions
        if current_user.role == 'student':
            if not current_user.student:
                return jsonify({'error': 'Student profile not found'}), 404
            if not check_student_chat_access(chat_id, current_user.student.id):
                return jsonify({'error': 'You do not have access to this chat assistant'}), 403
            # Verify student owns this session
            result = db.session.execute(
                text('''
                    SELECT 1 FROM student_chat_sessions
                    WHERE student_id = :student_id AND chat_id = :chat_id AND session_id = :session_id
                '''),
                {
                    'student_id': current_user.student.id,
                    'chat_id': chat_id,
                    'session_id': session_id
                }
            ).fetchone()
            if not result:
                return jsonify({'error': 'You do not have access to this session'}), 403
            student_id = current_user.student.id
        elif current_user.role in ['admin', 'instructor']:
            # Admin/instructor can evaluate any session, but we need to find the student
            result = db.session.execute(
                text('''
                    SELECT student_id FROM student_chat_sessions
                    WHERE chat_id = :chat_id AND session_id = :session_id
                '''),
                {'chat_id': chat_id, 'session_id': session_id}
            ).fetchone()
            if not result:
                return jsonify({'error': 'Session not found or not created by a student'}), 404
            student_id = result[0]
        else:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get API key for fetching session messages
        api_key_to_use = get_api_key_for_user(current_user, chat_id)
        
        # Fetch session details from RAGFlow to get messages
        response = requests.get(
            f'{RAGFLOW_BASE_URL}/api/v1/chats/{chat_id}/sessions',
            headers=get_ragflow_headers(api_key_to_use),
            params={'id': session_id},
            timeout=30
        )
        
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch session details'}), 500
        
        response_data = response.json()
        if response_data.get('code') != 0 or not response_data.get('data'):
            return jsonify({'error': 'Session not found'}), 404
        
        sessions = response_data.get('data', [])
        if not sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        session = sessions[0]
        messages = session.get('messages', [])
        
        if not messages:
            return jsonify({'error': 'No messages found in this session'}), 400
        
        # Filter out empty messages and count meaningful interactions
        meaningful_messages = []
        for msg in messages:
            role = msg.get('role', '')
            content = msg.get('content', '').strip()
            if content and len(content) > 0:
                meaningful_messages.append(msg)
        
        # Require minimum meaningful interactions for evaluation
        # At least 4 messages (2 from student, 2 from assistant) for a basic conversation
        if len(meaningful_messages) < 4:
            return jsonify({
                'error': 'Insufficient conversation data. Please have at least a few exchanges before generating an evaluation.'
            }), 400
        
        # Count student messages (should have at least 2 meaningful student messages)
        student_messages = [msg for msg in meaningful_messages if msg.get('role') == 'user']
        if len(student_messages) < 2:
            return jsonify({
                'error': 'Insufficient student participation. Please have more interactions before generating an evaluation.'
            }), 400
        
        # Build chat transcript
        chat_transcript = ""
        for msg in meaningful_messages:
            role = msg.get('role', '')
            content = msg.get('content', '').strip()
            if role == 'user':
                chat_transcript += f"Student: {content}\n\n"
            elif role == 'assistant':
                # Check if content has character markers
                if '[character: Patient]' in content or '[character:patient]' in content.lower():
                    chat_transcript += f"Patient: {content.replace('[character: Patient]', '').replace('[character:patient]', '').strip()}\n\n"
                elif '[character: Instructor]' in content or '[character:instructor]' in content.lower():
                    chat_transcript += f"Instructor: {content.replace('[character: Instructor]', '').replace('[character:instructor]', '').strip()}\n\n"
                else:
                    chat_transcript += f"Assistant: {content}\n\n"
        
        # Generate evaluation using OpenAI
        prompt = f"""You are a strict medical examiner evaluating a student's performance in a simulated patient interaction. Be critical and realistic in your assessment.

Below is the full chat transcript between the student and the AI assistant (which alternated between [character: Patient] and [character: Instructor]):

{chat_transcript}

---

IMPORTANT EVALUATION GUIDELINES:
- Be STRICT and CRITICAL. Do not give high scores for minimal or superficial interactions.
- If the conversation is too short, lacks depth, or shows minimal engagement, scores should be LOW (below 60).
- Only award high scores (75+) for comprehensive, well-structured, and meaningful medical interactions.
- If the student asks very few questions, has no clinical reasoning demonstrated, or shows poor engagement, scores should reflect this.
- Empty conversations, single exchanges, or very brief interactions should receive scores below 50.
- Consider the QUALITY and DEPTH of the interaction, not just the presence of messages.

Evaluate the student's performance based on these criteria:

1. **History Taking (0-20):** Did the student ask relevant, comprehensive, and structured questions? Did they gather sufficient information? Score LOW if only a few basic questions were asked.

2. **Clinical Reasoning (0-20):** Did the student demonstrate logical thinking toward diagnosis or treatment? Did they show analytical skills? Score LOW if no reasoning was demonstrated.

3. **Communication (0-20):** Was the student empathetic, clear, and professional? Did they communicate effectively? Score LOW if communication was minimal or unprofessional.

4. **Focus (0-20):** Did the student stay on topic and maintain focus throughout the interaction? Score LOW if they were distracted or off-topic.

5. **Professionalism (0-20):** Did the student maintain appropriate professional boundaries and behavior? Score LOW if behavior was unprofessional.

6. **Instructor Interventions:** Note how many times the assistant switched to [character: Instructor] and why. Frequent instructor interventions suggest poor performance.

---

SCORING GUIDELINES:
- Overall score below 50: Very poor performance, minimal engagement, or insufficient interaction
- Overall score 50-60: Below average, significant gaps in performance
- Overall score 60-75: Average to good performance with some areas needing improvement
- Overall score 75-85: Good performance with minor areas for improvement
- Overall score 85-100: Excellent performance, comprehensive interaction

### Output Format (JSON only)

{{
  "overall_score": "<0–100>",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "recommendations": ["..."],
  "category_scores": {{
    "history_taking": "<0–20>",
    "clinical_reasoning": "<0–20>",
    "communication": "<0–20>",
    "focus": "<0–20>",
    "professionalism": "<0–20>"
  }}
}}

Return ONLY valid JSON, no other text. Be critical and realistic in your scoring."""
        
        try:
            client = get_openai_client()
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert medical examiner. Return only valid JSON responses."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            evaluation_text = completion.choices[0].message.content
            evaluation_data = json.loads(evaluation_text)
            
            # Validate and parse the evaluation data
            overall_score = int(evaluation_data.get('overall_score', 0))
            strengths = evaluation_data.get('strengths', [])
            weaknesses = evaluation_data.get('weaknesses', [])
            recommendations = evaluation_data.get('recommendations', [])
            category_scores = evaluation_data.get('category_scores', {})
            
            # Convert category scores to integers
            category_scores_int = {}
            for category, score in category_scores.items():
                try:
                    category_scores_int[category] = int(score)
                except (ValueError, TypeError):
                    category_scores_int[category] = 0
            
            # Store evaluation in database
            db.session.execute(
                text('''
                    INSERT INTO evaluation_reports 
                    (student_id, chat_id, session_id, overall_score, strengths, weaknesses, recommendations, category_scores, created_at, updated_at)
                    VALUES (:student_id, :chat_id, :session_id, :overall_score, :strengths, :weaknesses, :recommendations, :category_scores, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                        overall_score = VALUES(overall_score),
                        strengths = VALUES(strengths),
                        weaknesses = VALUES(weaknesses),
                        recommendations = VALUES(recommendations),
                        category_scores = VALUES(category_scores),
                        updated_at = NOW()
                '''),
                {
                    'student_id': student_id,
                    'chat_id': chat_id,
                    'session_id': session_id,
                    'overall_score': overall_score,
                    'strengths': json.dumps(strengths),
                    'weaknesses': json.dumps(weaknesses),
                    'recommendations': json.dumps(recommendations),
                    'category_scores': json.dumps(category_scores_int)
                }
            )
            db.session.commit()
            
            return jsonify({
                'success': True,
                'evaluation': {
                    'overall_score': overall_score,
                    'strengths': strengths,
                    'weaknesses': weaknesses,
                    'recommendations': recommendations,
                    'category_scores': category_scores_int
                }
            }), 200
            
        except openai.OpenAIError as e:
            return jsonify({'error': f'OpenAI API error: {str(e)}'}), 500
        except json.JSONDecodeError as e:
            return jsonify({'error': f'Failed to parse evaluation response: {str(e)}'}), 500
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to generate evaluation: {str(e)}'}), 500
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@evaluations_bp.route('/chats/<chat_id>/sessions/<session_id>/evaluation', methods=['GET'])
@jwt_required()
def get_evaluation(chat_id, session_id):
    """Get evaluation report for a session"""
    try:
        current_user = get_current_user()
        
        # Check access
        if current_user.role == 'student':
            if not current_user.student:
                return jsonify({'error': 'Student profile not found'}), 404
            if not check_student_chat_access(chat_id, current_user.student.id):
                return jsonify({'error': 'You do not have access to this chat assistant'}), 403
            # Verify student owns this session
            result = db.session.execute(
                text('''
                    SELECT 1 FROM student_chat_sessions
                    WHERE student_id = :student_id AND chat_id = :chat_id AND session_id = :session_id
                '''),
                {
                    'student_id': current_user.student.id,
                    'chat_id': chat_id,
                    'session_id': session_id
                }
            ).fetchone()
            if not result:
                return jsonify({'error': 'You do not have access to this session'}), 403
            student_id = current_user.student.id
        elif current_user.role in ['admin', 'instructor']:
            # Admin/instructor can view any evaluation, but we need to find the student
            result = db.session.execute(
                text('''
                    SELECT student_id FROM student_chat_sessions
                    WHERE chat_id = :chat_id AND session_id = :session_id
                '''),
                {'chat_id': chat_id, 'session_id': session_id}
            ).fetchone()
            if not result:
                return jsonify({'error': 'Session not found or not created by a student'}), 404
            student_id = result[0]
        else:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get evaluation from database
        result = db.session.execute(
            text('''
                SELECT 
                    id, overall_score, strengths, weaknesses, recommendations, category_scores,
                    created_at, updated_at
                FROM evaluation_reports
                WHERE student_id = :student_id AND chat_id = :chat_id AND session_id = :session_id
            '''),
            {
                'student_id': student_id,
                'chat_id': chat_id,
                'session_id': session_id
            }
        ).fetchone()
        
        if not result:
            return jsonify({
                'success': True,
                'evaluation': None,
                'message': 'No evaluation found for this session'
            }), 200
        
        evaluation = {
            'id': result[0],
            'overall_score': result[1],
            'strengths': json.loads(result[2]) if result[2] else [],
            'weaknesses': json.loads(result[3]) if result[3] else [],
            'recommendations': json.loads(result[4]) if result[4] else [],
            'category_scores': json.loads(result[5]) if result[5] else {},
            'created_at': result[6].isoformat() if result[6] else None,
            'updated_at': result[7].isoformat() if result[7] else None
        }
        
        return jsonify({
            'success': True,
            'evaluation': evaluation
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

