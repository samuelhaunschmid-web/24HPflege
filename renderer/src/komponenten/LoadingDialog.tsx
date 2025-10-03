import React from 'react'

interface LoadingDialogProps {
  isOpen: boolean
  title: string
  message: string
  progress?: number // 0-100
  showProgress?: boolean
}

export default function LoadingDialog({ 
  isOpen, 
  title, 
  message, 
  progress = 0, 
  showProgress = false 
}: LoadingDialogProps) {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        minWidth: '400px',
        maxWidth: '500px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        textAlign: 'center'
      }}>
        {/* Spinner */}
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 24px'
        }} />
        
        {/* Title */}
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827'
        }}>
          {title}
        </h3>
        
        {/* Message */}
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '16px',
          color: '#6b7280',
          lineHeight: '1.5'
        }}>
          {message}
        </p>
        
        {/* Progress Bar */}
        {showProgress && (
          <div style={{
            width: '100%',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            height: '8px',
            overflow: 'hidden',
            marginBottom: '16px'
          }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              backgroundColor: '#3b82f6',
              height: '100%',
              transition: 'width 0.3s ease-in-out'
            }} />
          </div>
        )}
        
        {/* Progress Text */}
        {showProgress && (
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            {Math.round(progress)}% abgeschlossen
          </p>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
