import { authService as result } from "../service/authService.js";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({children}) => {

    const isAuthenticated = result.isAuthenticated(); 

    if(!isAuthenticated){
        return <Navigate to ='/login' replace />

    }

    return children;

};


export default ProtectedRoute; 