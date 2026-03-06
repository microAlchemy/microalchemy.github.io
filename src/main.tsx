import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import App from './App'
import BlogIndex from './routes/BlogIndex'
import BlogPost from './routes/BlogPost'
import CareersIndex from './routes/CareersIndex'
import CareerPost from './routes/CareerPost'
import './index.css'

const RedirectRestorer = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.pathname !== '/') return

    let redirect = ''
    try {
      redirect = sessionStorage.getItem('__microalchemy_redirect') ?? ''
      sessionStorage.removeItem('__microalchemy_redirect')
    } catch {
      return
    }

    if (!redirect || redirect === '/') return
    navigate(redirect, { replace: true })
  }, [location.pathname, navigate])

  return null
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <RedirectRestorer />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/blog" element={<BlogIndex />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/careers" element={<CareersIndex />} />
        <Route path="/careers/:slug" element={<CareerPost />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
