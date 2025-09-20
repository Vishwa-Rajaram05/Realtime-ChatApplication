import {BrowserRouter as Router, Routes, Route} from "react-router-dom";
import Navbar from './components/Navbar.jsx';
import MainPage from "./pages/Mainpage.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Chat from "./pages/Chat.jsx"
import './App.css';

function App(){
  return(
    <Router>
      <div className="App">
        <Navbar/>
        <Routes>
          <Route path="/" element={<MainPage/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/signup" element={<Signup/>} />
          <Route path="/chatarea" element={
            <ProtectedRoute>
              <Chat/>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />}/>
        </Routes>
      </div>
    </Router>
  )
}

export default App;