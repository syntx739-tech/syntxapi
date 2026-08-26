import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import { Toaster } from 'sonner'
import { StaffApp } from './App'
import '../index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      <StaffApp />
      <Toaster
        position="bottom-right"
        theme="dark"
        className="arctic-toaster"
        toastOptions={{
          className: 'arctic-toast',
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(14, 165, 233, 0.2)',
            backdropFilter: 'blur(20px)',
          }
        }}
      />
    </MotionConfig>
  </React.StrictMode>,
)
