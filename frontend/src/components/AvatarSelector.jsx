import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

// Predefined avatar options (emojis)
const AVATAR_OPTIONS = [
  { emoji: '🤖', name: 'Robot' },
  { emoji: '👨‍⚕️', name: 'Doctor' },
  { emoji: '👩‍⚕️', name: 'Nurse' },
  { emoji: '🧑‍🔬', name: 'Scientist' },
  { emoji: '👨‍🏫', name: 'Teacher' },
  { emoji: '👩‍🏫', name: 'Teacher' },
  { emoji: '🎓', name: 'Graduate' },
  { emoji: '💼', name: 'Professional' },
  { emoji: '👤', name: 'Person' },
  { emoji: '🦉', name: 'Owl' },
  { emoji: '🐱', name: 'Cat' },
  { emoji: '🐶', name: 'Dog' },
  { emoji: '🌟', name: 'Star' },
  { emoji: '💡', name: 'Lightbulb' },
  { emoji: '🔬', name: 'Microscope' },
  { emoji: '📚', name: 'Books' },
];

// Convert emoji to base64 data URL
const emojiToBase64 = (emoji) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 128;
  canvas.height = 128;
  
  // Set background
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw emoji
  ctx.font = '80px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, canvas.width / 2, canvas.height / 2);
  
  return canvas.toDataURL('image/png');
};

export default function AvatarSelector({ value, onChange, className }) {
  const [selectedEmoji, setSelectedEmoji] = useState(null);

  // Initialize selected emoji from value if provided
  useEffect(() => {
    if (value && !selectedEmoji) {
      // Try to find matching emoji by checking if value is a base64 image
      // For now, we'll just show the preview if value exists
      setSelectedEmoji(null);
    }
  }, [value]);

  const handleSelect = (emoji) => {
    const base64 = emojiToBase64(emoji);
    setSelectedEmoji(emoji);
    onChange(base64);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-8 gap-2">
        {AVATAR_OPTIONS.map((option, index) => {
          const isSelected = selectedEmoji === option.emoji;
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(option.emoji)}
              className={cn(
                'w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl transition-all hover:scale-110 cursor-pointer',
                isSelected
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
              title={option.name}
            >
              {option.emoji}
            </button>
          );
        })}
      </div>
      {(value || selectedEmoji) && (
        <div className="flex items-center space-x-2 mt-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
            <img 
              src={value || (selectedEmoji ? emojiToBase64(selectedEmoji) : '')} 
              alt="Selected avatar" 
              className="w-full h-full object-cover" 
            />
          </div>
          <span className="text-xs text-muted-foreground">Selected avatar</span>
        </div>
      )}
    </div>
  );
}

