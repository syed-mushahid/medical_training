# Medical Training Portal - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Features & Flows](#features--flows)
5. [Business Logic](#business-logic)
6. [Database Schema](#database-schema)
7. [API Documentation](#api-documentation)
8. [Security Features](#security-features)
9. [Technical Stack](#technical-stack)
10. [Deployment Guide](#deployment-guide)

---

## Overview

The **Medical Training Portal** is a comprehensive full-stack web application designed for medical training and education. It provides a platform for administrators, instructors, and students to manage educational content, conduct AI-powered chat conversations, and evaluate student performance.

### Key Capabilities
- **Multi-role User Management**: Admin, Instructor, and Student roles with distinct permissions
- **Group-based Learning**: Students can be organized into groups with multiple instructors
- **RAGFlow Integration**: Full integration with RAGFlow for dataset management and AI chat assistants
- **AI Chat Conversations**: Real-time chat interactions with AI assistants for medical training scenarios
- **Performance Evaluation**: Automated evaluation reports using OpenAI GPT models
- **Document Management**: Upload, parse, and manage educational documents with chunking capabilities

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  - React 18 + Vite                                           │
│  - Tailwind CSS + shadcn/ui                                  │
│  - React Router for navigation                               │
│  - Axios for API calls                                       │
│  - Server-Sent Events (SSE) for streaming                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST API
                       │ JWT Authentication
┌──────────────────────┴──────────────────────────────────────┐
│              Backend (Flask)                                 │
│  - Flask REST API                                            │
│  - SQLAlchemy ORM                                            │
│  - JWT Authentication                                        │
│  - Role-based Access Control                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌────▼──────┐
│   MySQL      │ │  RAGFlow    │ │  OpenAI   │
│  Database    │ │   API       │ │   API     │
│              │ │             │ │           │
│ - Users      │ │ - Datasets  │ │ - GPT-4o  │
│ - Instructors│ │ - Documents │ │   mini    │
│ - Students   │ │ - Chunks    │ │           │
│ - Groups     │ │ - Chats     │ │           │
│ - Sessions   │ │ - Sessions  │ │           │
│ - Evaluations│ │             │ │           │
└──────────────┘ └─────────────┘ └───────────┘
```

### Frontend Architecture

**Component Structure:**
- **Pages**: Route-level components (Login, Dashboard, etc.)
- **Components**: Reusable UI components (Layout, Loading, etc.)
- **Context**: Global state management (AuthContext)
- **Lib**: Utility functions and API client

**State Management:**
- React Context API for authentication
- Local component state for UI interactions
- Axios interceptors for automatic token injection

### Backend Architecture

**Layered Architecture:**
1. **Routes Layer**: HTTP endpoints organized by feature
2. **Business Logic Layer**: Utility functions and decorators
3. **Data Access Layer**: SQLAlchemy ORM models
4. **External Services**: RAGFlow API, OpenAI API

**Key Design Patterns:**
- Blueprint-based route organization
- Decorator pattern for authentication/authorization
- Factory pattern for Flask app creation
- Repository pattern via SQLAlchemy models

---

## User Roles & Permissions

### Admin
**Full System Access**
- ✅ Manage all instructors (CRUD)
- ✅ Manage all students (CRUD)
- ✅ Manage all student groups (CRUD)
- ✅ Access all RAGFlow features
- ✅ Manage chat assistants
- ✅ View all chat sessions
- ✅ Generate evaluation reports for any student
- ✅ Update own profile (email)
- ✅ Change own password

**Business Logic:**
- Admins are seeded automatically on first run
- Can create instructors with RAGFlow API keys
- Full access to all datasets and chat assistants
- Can assign chats to any student or group

### Instructor
**Limited Management Access**
- ✅ Manage students (CRUD)
- ✅ Manage student groups (CRUD)
- ✅ Access RAGFlow features (using personal API key or global)
- ✅ Manage chat assistants
- ✅ View chat sessions for assigned chats
- ✅ Generate evaluation reports for students
- ✅ Update own profile (name, phone, email, RAGFlow API key)
- ✅ Change own password

**Business Logic:**
- Can only see students they manage or in their groups
- Can create groups and assign students to them
- Each instructor can have their own RAGFlow API key
- Can assign chats to students or groups they manage
- Uses their API key when students use assigned chats

### Student
**Read-Only + Chat Access**
- ✅ View own profile information
- ✅ View assigned groups
- ✅ View assigned chat assistants
- ✅ Create and manage own chat sessions
- ✅ Engage in conversations with AI assistants
- ✅ View own evaluation reports
- ✅ Update own profile (name, phone, DOB, email)
- ✅ Change own password

**Business Logic:**
- Can only see chat assistants assigned to them or their groups
- Can only create sessions for assigned chats
- Can only view their own sessions and conversations
- Cannot see other students' data
- When using a chat, system uses the assigning instructor's API key

---

## Features & Flows

### 1. Authentication & Authorization

#### Flow Diagram
```
User → Login Page → Enter Credentials → Backend Validation
  ↓
JWT Token Generated → Stored in localStorage → Redirect to Dashboard
  ↓
Token Included in API Requests → Backend Validates → Role-based Access
```

#### Implementation Details

**Login Process:**
1. User submits email and password
2. Backend validates credentials against `user` table
3. If valid, JWT token is generated with user ID
4. Token stored in `localStorage` on frontend
5. User profile data (including role-specific profile) returned
6. Frontend redirects based on role

**Token Management:**
- Token stored in `localStorage` as `token`
- Axios interceptor adds `Authorization: Bearer <token>` header
- Token validated on every protected route
- Auto-logout on 401 response

**Route Protection:**
- Frontend: `ProtectedRoute` component checks role
- Backend: `@jwt_required()` and role decorators (`@admin_required`, `@admin_or_instructor_required`, `@student_required`)

**Key Files:**
- Backend: `routes/auth.py`, `utils.py`
- Frontend: `pages/Login.jsx`, `context/AuthContext.jsx`, `components/ProtectedRoute`

---

### 2. User Management

#### 2.1 Instructor Management (Admin Only)

**Flow:**
```
Admin → Instructors Page → View List
  ↓
Create: Click "Create" → Fill Form → Submit
  → Backend creates User + Instructor → Returns instructor data
  ↓
Update: Click "Edit" → Modify Form → Submit
  → Backend updates Instructor + User (if email changed) → Returns updated data
  ↓
Delete: Click "Delete" → Confirm → Backend deletes Instructor + User (cascade)
```

**Data Model:**
- `User` table: email, password_hash, role='instructor'
- `Instructor` table: first_name, last_name, phone, ragflow_api_key (optional)
- One-to-one relationship: User ↔ Instructor

**Business Rules:**
- Email must be unique across all users
- RAGFlow API key is optional but recommended
- Deleting an instructor cascades to delete associated user
- Instructor can belong to multiple groups

**API Endpoints:**
- `GET /api/instructors` - List all instructors
- `POST /api/instructors` - Create instructor
- `GET /api/instructors/:id` - Get instructor details
- `PUT /api/instructors/:id` - Update instructor
- `DELETE /api/instructors/:id` - Delete instructor

**Key Files:**
- Backend: `routes/instructors.py`
- Frontend: `pages/Instructors.jsx`

#### 2.2 Student Management (Admin & Instructor)

**Flow:**
```
Admin/Instructor → Students Page → View List
  ↓
Create: Click "Create" → Fill Form (including Student ID) → Submit
  → Backend creates User + Student → Returns student data
  ↓
Update: Click "Edit" → Modify Form → Submit
  → Backend updates Student + User → Returns updated data
  ↓
Delete: Click "Delete" → Confirm → Backend deletes Student + User (cascade)
```

**Data Model:**
- `User` table: email, password_hash, role='student'
- `Student` table: student_id (unique), first_name, last_name, phone, date_of_birth
- One-to-one relationship: User ↔ Student
- Many-to-many relationship: Student ↔ StudentGroup

**Business Rules:**
- Student ID must be unique
- Students can belong to multiple groups
- Deleting a student removes them from all groups
- Instructors can only see students in their groups or all students (if admin)

**API Endpoints:**
- `GET /api/students` - List all students
- `POST /api/students` - Create student
- `GET /api/students/:id` - Get student details
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

**Key Files:**
- Backend: `routes/students.py`
- Frontend: `pages/Students.jsx`

---

### 3. Student Groups

**Flow:**
```
Admin/Instructor → Student Groups Page → View List
  ↓
Create: Click "Create" → Fill Form (name, description)
  → Select Students (multiple) → Select Instructors (multiple) → Submit
  → Backend creates group and associations → Returns group data
  ↓
Update: Click "Edit" → Modify Form → Update Members → Submit
  → Backend updates group and associations → Returns updated data
  ↓
Delete: Click "Delete" → Confirm → Backend deletes group (cascades associations)
```

**Data Model:**
- `StudentGroup` table: name, description, created_by_instructor_id
- Association tables:
  - `student_group_association`: student_id, group_id
  - `instructor_group_association`: instructor_id, group_id

**Business Rules:**
- Groups can have multiple students
- Groups can have multiple instructors
- Groups track creator (instructor who created it)
- Deleting a group removes all associations but not students/instructors
- Students can belong to multiple groups
- Instructors can be assigned to multiple groups

**Use Cases:**
- Organize students by course, semester, or specialization
- Assign multiple instructors to a group for collaborative teaching
- Assign chat assistants to entire groups

**API Endpoints:**
- `GET /api/student-groups` - List all groups
- `POST /api/student-groups` - Create group
- `GET /api/student-groups/:id` - Get group details
- `PUT /api/student-groups/:id` - Update group
- `DELETE /api/student-groups/:id` - Delete group

**Key Files:**
- Backend: `routes/student_groups.py`
- Frontend: `pages/StudentGroups.jsx`

---

### 4. RAGFlow Integration

RAGFlow is an external service for managing datasets, documents, and AI chat assistants. The portal integrates with RAGFlow's REST API.

#### 4.1 Dataset Management

**Flow:**
```
Admin/Instructor → Dataset Page → View List
  ↓
Create: Click "Create" → Fill Form
  (name, description, language, chunk_method, parser_config)
  → Submit → Backend calls RAGFlow API → Returns dataset ID
  ↓
List: Backend fetches from RAGFlow → Displays in table
  ↓
Update: Click "Edit" → Modify Form → Submit
  → Backend calls RAGFlow PUT API → Updates dataset
  ↓
Delete: Select → Click "Delete" → Confirm
  → Backend calls RAGFlow DELETE API → Removes dataset
```

**API Key Resolution:**
1. If instructor has personal `ragflow_api_key`, use it
2. Otherwise, use global `RAGFLOW_API_KEY` from config
3. Admins always use global key

**Data Flow:**
- Datasets stored in RAGFlow, not locally
- Local database only stores assignments and session tracking
- All CRUD operations proxy to RAGFlow API

**API Endpoints:**
- `GET /api/ragflow/datasets` - List datasets
- `POST /api/ragflow/datasets` - Create dataset
- `PUT /api/ragflow/datasets/:id` - Update dataset
- `DELETE /api/ragflow/datasets` - Delete datasets (single/multiple/all)
- `GET /api/ragflow/datasets/:id/knowledge_graph` - Get knowledge graph
- `DELETE /api/ragflow/datasets/:id/knowledge_graph` - Delete knowledge graph

**Key Files:**
- Backend: `routes/ragflow.py`
- Frontend: `pages/RAGFlow.jsx`

#### 4.2 Document Management

**Flow:**
```
Admin/Instructor → Dataset → Documents Page → View List
  ↓
Upload: Click "Upload" → Select Files (multiple) → Submit
  → Backend sends multipart/form-data to RAGFlow → Returns document IDs
  ↓
List: Backend fetches from RAGFlow with pagination/filtering
  → Displays documents with status (parsed, parsing, failed)
  ↓
Parse: Select documents → Click "Parse" → Backend triggers parsing
  ↓
Download: Click "Download" → Backend proxies file from RAGFlow
  ↓
Delete: Select → Click "Delete" → Backend removes from RAGFlow
```

**Features:**
- Multiple file upload support
- Pagination and filtering (by name, status)
- Document parsing status tracking
- Chunk generation after parsing
- Image proxy for displaying images in chunks

**API Endpoints:**
- `GET /api/ragflow/datasets/:datasetId/documents` - List documents
- `POST /api/ragflow/datasets/:datasetId/documents` - Upload documents
- `GET /api/ragflow/datasets/:datasetId/documents/:documentId` - Download document
- `PUT /api/ragflow/datasets/:datasetId/documents/:documentId` - Update document
- `DELETE /api/ragflow/datasets/:datasetId/documents` - Delete documents
- `POST /api/ragflow/datasets/:datasetId/chunks` - Parse documents
- `DELETE /api/ragflow/datasets/:datasetId/chunks` - Stop parsing
- `GET /api/ragflow/datasets/:datasetId/documents/:documentId/image` - Proxy image

**Key Files:**
- Backend: `routes/ragflow_documents.py`
- Frontend: `pages/DatasetDocuments.jsx`

#### 4.3 Chunk Management

**Flow:**
```
Admin/Instructor → Document → Chunks Page → View List
  ↓
List: Backend fetches chunks from RAGFlow → Displays with images
  ↓
Add: Click "Add Chunk" → Fill Form (content, keywords, questions)
  → Submit → Backend creates chunk in RAGFlow
  ↓
Update: Click "Edit" → Modify Form → Toggle Availability → Submit
  → Backend updates chunk in RAGFlow
  ↓
Search: Type in search box → Frontend filters chunks (client-side)
```

**Features:**
- Display chunks with full content and images
- Image display via proxy endpoint
- Frontend-only search functionality
- Availability toggle (available/unavailable)
- Keywords and questions metadata

**API Endpoints:**
- `GET /api/ragflow/datasets/:datasetId/documents/:documentId/chunks` - List chunks
- `POST /api/ragflow/datasets/:datasetId/documents/:documentId/chunks` - Add chunk
- `PUT /api/ragflow/datasets/:datasetId/documents/:documentId/chunks/:chunkId` - Update chunk

**Key Files:**
- Backend: `routes/ragflow_documents.py` (chunk endpoints)
- Frontend: `pages/DocumentChunks.jsx`

#### 4.4 Chat Assistant Management

**Flow:**
```
Admin/Instructor → Chat Assistants Page → View List
  ↓
Create: Click "Create" → Fill Form
  (name, avatar, dataset_ids, LLM settings, prompt settings)
  → Submit → Backend creates chat in RAGFlow → Returns chat ID
  ↓
List: Backend fetches from RAGFlow → Displays with details
  ↓
Update: Click "Edit" → Modify Form → Submit
  → Backend updates chat in RAGFlow
  ↓
Delete: Select → Click "Delete" → Confirm
  → Backend deletes from RAGFlow → Cleans up local assignments
```

**Features:**
- Multiple dataset support per chat
- LLM configuration (model, temperature, etc.)
- Prompt customization
- Avatar support
- Local assignment tracking

**Business Logic:**
- When chat is deleted, all assignments and sessions are cleaned up locally
- Students can only see assigned chats
- API key resolution: uses instructor's key if chat was assigned by them

**API Endpoints:**
- `GET /api/ragflow/chats` - List chat assistants
- `POST /api/ragflow/chats` - Create chat assistant
- `PUT /api/ragflow/chats/:id` - Update chat assistant
- `DELETE /api/ragflow/chats` - Delete chat assistants

**Key Files:**
- Backend: `routes/ragflow_chats.py`
- Frontend: `pages/ChatAssistants.jsx`

---

### 5. Chat Conversations & Sessions

#### 5.1 Session Management

**Flow:**
```
User → Chat Assistant → Sessions Page → View List
  ↓
Create: Click "Create Session" → Enter Name → Submit
  → Backend creates session in RAGFlow → Returns session ID
  → For students: Also creates record in student_chat_sessions
  ↓
List: Backend fetches from RAGFlow
  → For admin/instructor: Enriched with student info and evaluation scores
  → For students: Filtered to only their own sessions
  ↓
Delete: Select → Click "Delete" → Confirm
  → Backend deletes from RAGFlow → Cleans up local tracking
```

**Session Ownership:**
- Students: Can only see and access sessions they created
- Admin/Instructor: Can see all sessions with student information

**Data Model:**
- Sessions stored in RAGFlow
- Local `student_chat_sessions` table tracks: student_id, chat_id, session_id

**API Endpoints:**
- `GET /api/ragflow/chats/:chatId/sessions` - List sessions
- `POST /api/ragflow/chats/:chatId/sessions` - Create session
- `PUT /api/ragflow/chats/:chatId/sessions/:sessionId` - Update session
- `DELETE /api/ragflow/chats/:chatId/sessions` - Delete sessions

**Key Files:**
- Backend: `routes/ragflow_sessions.py`
- Frontend: `pages/ChatSessions.jsx`, `pages/StudentChats.jsx`

#### 5.2 Chat Conversations

**Flow:**
```
User → Session → Messages Page → View Conversation
  ↓
Send Message: Type message → Click "Send"
  → Frontend sends POST request with stream=true
  → Backend proxies to RAGFlow with streaming
  → Backend streams response via Server-Sent Events (SSE)
  ↓
Display: Frontend receives SSE chunks
  → Queues chunks → Displays with typing effect (character by character)
  → Handles character markers ([character: Patient], [character: Instructor])
  → Applies different styling based on character
  ↓
Evaluation: Click "Generate Evaluation" → Backend validates conversation
  → Sends to OpenAI → Parses JSON response → Stores in database
  → Displays report with color-coded scores
```

**Technical Details:**

**Streaming Implementation:**
- Uses Server-Sent Events (SSE) for real-time responses
- Frontend uses `fetch` API with `ReadableStream`
- Typing effect: Characters displayed progressively (10 chars/second)
- Queue system: New chunks queue after previous text completes

**Character Handling:**
- Detects `[character: Patient]` and `[character: Instructor]` markers
- Hides markers from display
- Applies different styling:
  - Patient: Blue background, blue avatar
  - Instructor: Green background, green avatar
  - Default: Purple background, purple avatar

**Message Flow:**
```
User Message → Add to UI immediately
  ↓
Assistant Message (loading) → Add placeholder
  ↓
SSE Stream → Accumulate answer → Update placeholder
  ↓
Typing Effect → Display character by character
  ↓
Complete → Show full message with references
```

**Business Rules:**
- After evaluation is generated, no new messages can be sent
- Students can only access their own sessions
- References (chunks) displayed below assistant messages
- Images in chunks displayed via proxy

**API Endpoints:**
- `POST /api/ragflow/chats/:chatId/completions` - Send message (streaming)

**Key Files:**
- Backend: `routes/ragflow_completions.py`
- Frontend: `pages/ChatMessages.jsx`

---

### 6. Chat Assignments

**Flow:**
```
Admin/Instructor → Chat Assistant → Assignments Page
  ↓
Assign to Students: Select students → Click "Assign"
  → Backend creates records in chat_student_association
  → Stores instructor_id for API key resolution
  ↓
Assign to Groups: Select groups → Click "Assign"
  → Backend creates records in chat_student_group_association
  → All students in group get access
  ↓
View Assignments: Backend fetches assigned students and groups
  → Displays in table with remove option
  ↓
Remove: Click "Remove" → Backend deletes association
```

**Data Model:**
- `chat_student_association`: chat_id, student_id, instructor_id
- `chat_student_group_association`: chat_id, group_id, instructor_id

**Business Logic:**
- Students get access if:
  - Chat assigned directly to them, OR
  - Chat assigned to a group they belong to
- When student uses chat, system uses the instructor's API key who assigned it
- Priority: Direct assignment > Group assignment
- If multiple instructors assigned, uses first found

**API Key Resolution for Students:**
```
Student uses chat → Backend checks:
  1. Is chat assigned directly to student?
     → Use instructor_id from chat_student_association
  2. Is chat assigned to student's group?
     → Use instructor_id from chat_student_group_association
  3. Fallback: Use global RAGFLOW_API_KEY
```

**API Endpoints:**
- `GET /api/ragflow/chats/:chatId/assignments` - Get assignments
- `POST /api/ragflow/chats/:chatId/assignments/students` - Assign to students
- `POST /api/ragflow/chats/:chatId/assignments/groups` - Assign to groups
- `DELETE /api/ragflow/chats/:chatId/assignments/students/:studentId` - Remove student
- `DELETE /api/ragflow/chats/:chatId/assignments/groups/:groupId` - Remove group
- `GET /api/student/assigned-chats` - Get student's assigned chats

**Key Files:**
- Backend: `routes/chat_assignments.py`
- Frontend: `pages/ChatAssignments.jsx`, `pages/StudentChats.jsx`

---

### 7. Evaluation Reports

**Flow:**
```
Instructor/Admin → Chat Session → Messages Page
  ↓
Generate Evaluation: Click "Generate Evaluation" button
  → Backend validates conversation (minimum 4 messages, 2 from student)
  → Fetches full conversation from RAGFlow
  → Builds transcript (removes character markers)
  → Sends to OpenAI GPT-4o-mini with evaluation prompt
  ↓
OpenAI Processing: Analyzes conversation
  → Generates JSON with scores, strengths, weaknesses, recommendations
  → Returns structured evaluation
  ↓
Storage: Backend parses JSON → Validates structure
  → Stores in evaluation_reports table
  → Returns evaluation to frontend
  ↓
Display: Frontend shows evaluation report
  → Color-coded scores (red < 50, orange 50-60, yellow 60-75, green 75+)
  → Category scores (history_taking, clinical_reasoning, communication, focus, professionalism)
  → Strengths, weaknesses, recommendations
  ↓
After Evaluation: Session locked - no new messages allowed
```

**Evaluation Criteria:**
1. **History Taking (0-20)**: Quality and depth of questions asked
2. **Clinical Reasoning (0-20)**: Logical thinking toward diagnosis
3. **Communication (0-20)**: Empathy, clarity, professionalism
4. **Focus (0-20)**: Staying on topic and maintaining focus
5. **Professionalism (0-20)**: Appropriate boundaries and behavior
6. **Overall Score (0-100)**: Weighted average of all categories

**Validation Rules:**
- Minimum 4 meaningful messages (2 from student, 2 from assistant)
- Filters out empty messages
- Stricter scoring for minimal conversations
- Requires actual engagement, not just presence

**Prompt Engineering:**
- Strict evaluation guidelines
- Critical scoring (doesn't give high scores for minimal interactions)
- Detailed category explanations
- JSON format requirement

**Data Model:**
- `evaluation_reports` table:
  - student_id, chat_id, session_id (composite unique key)
  - overall_score (INT)
  - strengths, weaknesses, recommendations (TEXT/JSON)
  - category_scores (JSON)

**Display Logic:**
- Scores displayed in sessions list table
- Color coding:
  - Red: < 50%
  - Orange: 50-60%
  - Yellow: 60-75%
  - Green: 75-100%
- Category scores converted to percentages for color calculation

**API Endpoints:**
- `POST /api/chats/:chatId/sessions/:sessionId/evaluate` - Generate evaluation
- `GET /api/chats/:chatId/sessions/:sessionId/evaluation` - Get evaluation

**Key Files:**
- Backend: `routes/evaluations.py`
- Frontend: `pages/ChatMessages.jsx`

---

### 8. Profile Management

#### 8.1 Student Profile

**Flow:**
```
Student → Profile Information Page → View Profile
  ↓
Edit Profile: Click "Edit Profile" → Modify Form
  (first_name, last_name, phone, date_of_birth, email)
  → Submit → Backend updates Student + User
  ↓
Change Password: Click "Change Password" → Enter passwords
  (current_password, new_password, confirm_password)
  → Submit → Backend validates → Updates password_hash
```

**Business Rules:**
- Cannot update: student_id, role, created_at
- Email must be unique
- Password must be at least 6 characters
- Current password required for password change

**API Endpoints:**
- `PUT /api/student/profile` - Update profile
- `POST /api/student/change-password` - Change password

**Key Files:**
- Backend: `routes/student_profile.py`
- Frontend: `pages/StudentProfile.jsx`

#### 8.2 Instructor Profile

**Flow:**
```
Instructor → Profile Information Page → View Profile
  ↓
Edit Profile: Click "Edit Profile" → Modify Form
  (first_name, last_name, phone, email, ragflow_api_key)
  → Submit → Backend updates Instructor + User
  ↓
Change Password: Same as student flow
```

**Business Rules:**
- RAGFlow API key is optional
- If empty string provided, keeps current key unchanged
- Only updates if new value provided

**API Endpoints:**
- `PUT /api/instructor/profile` - Update profile
- `POST /api/instructor/change-password` - Change password

**Key Files:**
- Backend: `routes/instructor_profile.py`
- Frontend: `pages/InstructorProfile.jsx`

#### 8.3 Admin Profile

**Flow:**
```
Admin → Profile Information Page → View Profile
  ↓
Edit Profile: Click "Edit Profile" → Modify Email
  → Submit → Backend updates User email
  ↓
Change Password: Same as student flow
```

**Business Rules:**
- Admins only have email (no profile model)
- Direct updates to User table

**API Endpoints:**
- `PUT /api/admin/profile` - Update profile
- `POST /api/admin/change-password` - Change password

**Key Files:**
- Backend: `routes/admin_profile.py`
- Frontend: `pages/AdminProfile.jsx`

---

## Business Logic

### Access Control Logic

**Student Chat Access:**
```python
def check_student_chat_access(chat_id, student_id):
    # Check direct assignment
    if exists(chat_student_association where chat_id and student_id):
        return True
    
    # Check group assignment
    student_groups = get_student_groups(student_id)
    for group in student_groups:
        if exists(chat_student_group_association where chat_id and group_id):
            return True
    
    return False
```

**API Key Resolution:**
```python
def get_api_key_for_user(user, chat_id):
    if user.role == 'admin':
        return global_api_key
    
    if user.role == 'instructor':
        if user.instructor.ragflow_api_key:
            return user.instructor.ragflow_api_key
        return global_api_key
    
    if user.role == 'student':
        # Find instructor who assigned this chat
        instructor_id = get_assigning_instructor(chat_id, user.student.id)
        if instructor_id:
            instructor = get_instructor(instructor_id)
            if instructor.ragflow_api_key:
                return instructor.ragflow_api_key
        return global_api_key
```

**Session Visibility:**
```python
def list_sessions_for_student(chat_id, student_id):
    # Get only sessions created by this student
    student_session_ids = get_from(student_chat_sessions 
                                   where student_id and chat_id)
    
    # Fetch from RAGFlow
    all_sessions = fetch_from_ragflow(chat_id)
    
    # Filter to student's sessions
    return filter(all_sessions, session.id in student_session_ids)
```

### Evaluation Generation Logic

**Validation:**
1. Fetch session messages from RAGFlow
2. Filter empty messages
3. Count meaningful messages:
   - Total must be >= 4
   - Student messages must be >= 2
4. Build transcript with character markers handled
5. Send to OpenAI with strict prompt
6. Parse and validate JSON response
7. Store in database with unique constraint

**Scoring Guidelines:**
- Overall score reflects quality and depth, not quantity
- Category scores are critical (not generous)
- Frequent instructor interventions indicate poor performance
- Minimal interactions receive low scores (< 60)

### Deleted Chat Handling

**When Chat is Deleted from RAGFlow:**
1. Backend detects deletion
2. Cleans up local assignments:
   - `chat_student_association`
   - `chat_student_group_association`
   - `student_chat_sessions`
   - `evaluation_reports`
3. Frontend detects unavailable chats:
   - Shows toast notification
   - Redirects to appropriate page
   - Displays "Chat Assistant Unavailable" message

---

## Database Schema

### Core Tables

**user**
```sql
CREATE TABLE user (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,  -- 'admin', 'instructor', 'student'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);
```

**instructor**
```sql
CREATE TABLE instructor (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    ragflow_api_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
```

**student**
```sql
CREATE TABLE student (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    student_id VARCHAR(50) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_student_id (student_id)
);
```

**student_group**
```sql
CREATE TABLE student_group (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_by_instructor_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_instructor_id) REFERENCES instructor(id) ON DELETE SET NULL
);
```

### Association Tables

**student_group_association**
```sql
CREATE TABLE student_group_association (
    student_id INT,
    group_id INT,
    PRIMARY KEY (student_id, group_id),
    FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES student_group(id) ON DELETE CASCADE
);
```

**instructor_group_association**
```sql
CREATE TABLE instructor_group_association (
    instructor_id INT,
    group_id INT,
    PRIMARY KEY (instructor_id, group_id),
    FOREIGN KEY (instructor_id) REFERENCES instructor(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES student_group(id) ON DELETE CASCADE
);
```

### Chat Management Tables

**chat_student_association**
```sql
CREATE TABLE chat_student_association (
    chat_id VARCHAR(255) NOT NULL,
    student_id INT NOT NULL,
    instructor_id INT NOT NULL,
    PRIMARY KEY (chat_id, student_id),
    FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES instructor(id) ON DELETE CASCADE
);
```

**chat_student_group_association**
```sql
CREATE TABLE chat_student_group_association (
    chat_id VARCHAR(255) NOT NULL,
    group_id INT NOT NULL,
    instructor_id INT NOT NULL,
    PRIMARY KEY (chat_id, group_id),
    FOREIGN KEY (group_id) REFERENCES student_group(id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES instructor(id) ON DELETE CASCADE
);
```

**student_chat_sessions**
```sql
CREATE TABLE student_chat_sessions (
    student_id INT NOT NULL,
    chat_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (student_id, chat_id, session_id),
    FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
);
```

**evaluation_reports**
```sql
CREATE TABLE evaluation_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    chat_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    overall_score INT NOT NULL,
    strengths TEXT,
    weaknesses TEXT,
    recommendations TEXT,
    category_scores JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_session_evaluation (student_id, chat_id, session_id),
    FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
);
```

### Relationships Diagram

```
User (1) ────── (1) Instructor
  │
  │ (1)
  │
  └── (1) Student
  
Instructor (N) ──── (N) StudentGroup
Student (N) ──── (N) StudentGroup

Chat (N) ──── (N) Student (via chat_student_association)
Chat (N) ──── (N) StudentGroup (via chat_student_group_association)

Student (N) ──── (N) Session (via student_chat_sessions)
Session (1) ──── (1) EvaluationReport
```

---

## API Documentation

### Authentication Endpoints

**POST /api/auth/login**
- **Description**: Authenticate user and get JWT token
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "student",
      "profile": { ... }
    }
  }
  ```

**GET /api/auth/me**
- **Description**: Get current authenticated user info
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "student",
      "profile": { ... }
    }
  }
  ```

### Instructor Management (Admin Only)

**GET /api/instructors**
- **Description**: List all instructors
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  {
    "instructors": [
      {
        "id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "phone": "+1234567890",
        "ragflow_api_key": "xxx...",
        "user": {
          "id": 1,
          "email": "john@example.com",
          "role": "instructor"
        }
      }
    ]
  }
  ```

**POST /api/instructors**
- **Description**: Create new instructor
- **Request Body**:
  ```json
  {
    "email": "instructor@example.com",
    "password": "password123",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "ragflow_api_key": "optional_api_key"
  }
  ```

### Student Management (Admin & Instructor)

**GET /api/students**
- **Description**: List all students (filtered by instructor's groups if not admin)
- **Response**: `200 OK`
  ```json
  {
    "students": [
      {
        "id": 1,
        "student_id": "STU001",
        "first_name": "Jane",
        "last_name": "Smith",
        "phone": "+1234567890",
        "date_of_birth": "2000-01-01",
        "user": {
          "id": 2,
          "email": "jane@example.com",
          "role": "student"
        }
      }
    ]
  }
  ```

### RAGFlow Integration Endpoints

**GET /api/ragflow/datasets**
- **Description**: List all datasets from RAGFlow
- **Query Parameters**: `page`, `page_size`, `name`, `id`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "datasets": [
      {
        "id": "dataset_123",
        "name": "Medical Guidelines",
        "description": "...",
        "language": "en",
        "chunk_method": "naive",
        "parser_config": { ... }
      }
    ]
  }
  ```

**POST /api/ragflow/chats/:chatId/completions**
- **Description**: Send message to chat assistant (streaming)
- **Request Body**:
  ```json
  {
    "question": "What are the symptoms?",
    "session_id": "session_123",
    "stream": true
  }
  ```
- **Response**: `200 OK` (Server-Sent Events stream)
  ```
  data: {"code": 0, "data": {"answer": "The symptoms include..."}}
  data: {"code": 0, "data": {"answer": "The symptoms include fever..."}}
  data: true
  ```

### Evaluation Endpoints

**POST /api/chats/:chatId/sessions/:sessionId/evaluate**
- **Description**: Generate evaluation report for a session
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "evaluation": {
      "overall_score": 75,
      "strengths": ["Good communication", "..."],
      "weaknesses": ["Needs improvement in history taking", "..."],
      "recommendations": ["Practice more", "..."],
      "category_scores": {
        "history_taking": 15,
        "clinical_reasoning": 18,
        "communication": 16,
        "focus": 14,
        "professionalism": 12
      }
    }
  }
  ```

**GET /api/chats/:chatId/sessions/:sessionId/evaluation**
- **Description**: Get existing evaluation report
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "evaluation": { ... }
  }
  ```

### Profile Management Endpoints

**PUT /api/student/profile**
- **Description**: Update student profile
- **Request Body**:
  ```json
  {
    "first_name": "Jane",
    "last_name": "Smith",
    "phone": "+1234567890",
    "date_of_birth": "2000-01-01",
    "email": "jane@example.com"
  }
  ```

**POST /api/student/change-password**
- **Description**: Change student password
- **Request Body**:
  ```json
  {
    "current_password": "old_password",
    "new_password": "new_password",
    "confirm_password": "new_password"
  }
  ```

---

## Security Features

### Authentication & Authorization

1. **JWT-based Authentication**
   - Tokens contain user ID and role
   - Stored in localStorage (frontend)
   - Validated on every API request
   - Auto-logout on token expiration/invalidation

2. **Role-based Access Control (RBAC)**
   - Decorators: `@admin_required`, `@admin_or_instructor_required`, `@student_required`
   - Frontend route protection via `ProtectedRoute` component
   - API-level enforcement on all endpoints

3. **Password Security**
   - Passwords hashed using Werkzeug's `generate_password_hash`
   - Never stored in plain text
   - Minimum length validation (6 characters)
   - Current password required for changes

### Data Protection

1. **SQL Injection Prevention**
   - SQLAlchemy ORM prevents SQL injection
   - Parameterized queries for raw SQL
   - Input validation on all endpoints

2. **CORS Configuration**
   - Configured for specific origins
   - Credentials allowed
   - Preflight requests handled

3. **API Key Management**
   - RAGFlow API keys stored in database
   - Optional per-instructor keys
   - Global fallback key in config

4. **Session Isolation**
   - Students can only see their own sessions
   - Database tracking prevents cross-access
   - Validation on every session request

### Input Validation

- Email format validation
- Required field checks
- Type validation (dates, integers)
- Length limits
- Unique constraint enforcement

---

## Technical Stack

### Backend

**Core Framework:**
- **Flask 3.0.0**: Web framework
- **Flask-SQLAlchemy 3.1.1**: ORM for database operations
- **Flask-JWT-Extended 4.6.0**: JWT authentication
- **Flask-CORS 4.0.0**: Cross-origin resource sharing

**Database:**
- **MySQL**: Relational database
- **PyMySQL 1.1.0**: MySQL connector
- **SQLAlchemy**: ORM layer

**External APIs:**
- **requests 2.31.0**: HTTP client for RAGFlow API
- **openai 1.12.0**: OpenAI API client for evaluations

**Utilities:**
- **python-dotenv 1.0.0**: Environment variable management
- **Werkzeug 3.0.1**: Password hashing, utilities

### Frontend

**Core Framework:**
- **React 18**: UI library
- **Vite**: Build tool and dev server
- **React Router DOM**: Client-side routing

**Styling:**
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Component library
- **Lucide React**: Icon library

**HTTP Client:**
- **Axios**: Promise-based HTTP client
- **fetch API**: For Server-Sent Events streaming

**State Management:**
- **React Context API**: Global state (authentication)

### Development Tools

**Backend:**
- Python 3.8+
- Virtual environment support
- Automatic database migrations
- Debug mode for development

**Frontend:**
- Node.js 16+
- Hot Module Replacement (HMR)
- Fast refresh
- ESLint (optional)

---

## Deployment Guide

### Prerequisites

1. **Server Requirements:**
   - Python 3.8+ (backend)
   - Node.js 16+ (frontend build)
   - MySQL 5.7+ or MariaDB 10.3+
   - RAGFlow instance (external)
   - OpenAI API account (for evaluations)

2. **Environment Variables:**

**Backend (.env):**
```env
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=training_portal
JWT_SECRET_KEY=your-strong-secret-key
RAGFLOW_BASE_URL=http://your-ragflow-instance:80
RAGFLOW_API_KEY=your-global-ragflow-key
OPENAI_API_KEY=your-openai-api-key
FLASK_ENV=production
```

**Frontend (.env):**
```env
VITE_API_URL=http://your-backend-url:5000
```

### Backend Deployment

1. **Install Dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Database Setup:**
   ```sql
   CREATE DATABASE training_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Production Server:**
   ```bash
   # Using Gunicorn
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

4. **Systemd Service (Optional):**
   ```ini
   [Unit]
   Description=Training Portal Backend
   After=network.target

   [Service]
   User=www-data
   WorkingDirectory=/path/to/backend
   ExecStart=/path/to/venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 app:app
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

### Frontend Deployment

1. **Build for Production:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Serve with Nginx:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       root /path/to/frontend/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://46.224.35.114:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Or Serve with Node.js:**
   ```bash
   npm install -g serve
   serve -s dist -l 3000
   ```

### Security Considerations

1. **Change Default Credentials:**
   - Change default admin password immediately
   - Use strong JWT secret key
   - Rotate API keys regularly

2. **HTTPS:**
   - Use SSL/TLS certificates
   - Redirect HTTP to HTTPS
   - Secure cookies

3. **Database:**
   - Use strong database passwords
   - Limit database user permissions
   - Regular backups
   - Enable connection pooling

4. **API Security:**
   - Rate limiting
   - Input sanitization
   - CORS restrictions
   - API key rotation

5. **Monitoring:**
   - Log all errors
   - Monitor API usage
   - Track failed login attempts
   - Set up alerts

### Backup Strategy

1. **Database Backups:**
   ```bash
   mysqldump -u user -p training_portal > backup_$(date +%Y%m%d).sql
   ```

2. **Automated Backups:**
   - Daily database backups
   - Weekly full system backups
   - Off-site backup storage

---

## Conclusion

The Medical Training Portal is a comprehensive solution for medical education and training. It combines user management, AI-powered conversations, and automated evaluation to create an effective learning platform.

### Key Strengths
- **Scalable Architecture**: Modular design allows easy extension
- **Role-based Access**: Clear separation of permissions
- **AI Integration**: Seamless RAGFlow and OpenAI integration
- **Real-time Features**: Streaming chat responses
- **Comprehensive Evaluation**: Automated performance assessment

### Future Enhancements
- Analytics dashboard for instructors
- Bulk operations for students/groups
- Advanced reporting features
- Mobile app support
- Real-time notifications
- Document versioning
- Advanced search capabilities

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: Development Team

