import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function Home() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-base-content">Vite + React + daisyUI</h1>
        
        <div className="card bg-base-100 w-96 shadow-xl mx-auto mb-8">
          <figure className="px-10 pt-10">
            <div className="flex gap-4">
              <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
                <img src={viteLogo} className="logo w-16 h-16" alt="Vite logo" />
              </a>
              <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
                <img src={reactLogo} className="logo react w-16 h-16" alt="React logo" />
              </a>
            </div>
          </figure>
          <div className="card-body items-center text-center">
            <h2 className="card-title">Welcome!</h2>
            <p>Your React + React Router + daisyUI setup is working correctly!</p>
            <div className="card-actions">
              <button className="btn btn-primary" onClick={() => setCount((count) => count + 1)}>
                count is {count}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-base-content">
            Edit <code className="bg-base-300 px-2 py-1 rounded">src/App.jsx</code> and save to test HMR
          </p>
        </div>
      </div>
    </div>
  )
}

function About() {
  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-base-content">About Page</h1>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">About This Setup</h2>
            <p>This is a properly configured React application with:</p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>React 19 with Vite</li>
              <li>React Router for navigation</li>
              <li>daisyUI 5 with Tailwind CSS 4</li>
              <li>Custom theme support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <div className="navbar bg-base-100 shadow-lg">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
            </ul>
          </div>
          <Link to="/" className="btn btn-ghost text-xl">Attendance System</Link>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
          </ul>
        </div>
        <div className="navbar-end">
          <label className="swap swap-rotate">
            <input type="checkbox" className="theme-controller" value="titaniumghost" />
            <svg className="swap-off w-10 h-10 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm14-1a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V12A1,1,0,0,0,19,11Zm-7-7V3a1,1,0,0,0-2,0V4a1,1,0,0,0,2,0ZM12,19a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17l.71.71a1,1,0,0,0,1.41-1.41l-.71-.71A1,1,0,0,0,18.36,17ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/>
            </svg>
            <svg className="swap-on w-10 h-10 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/>
            </svg>
          </label>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  )
}

export default App
