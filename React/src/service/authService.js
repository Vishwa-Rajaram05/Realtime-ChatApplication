import axios from "axios";

const API_URL = "http://localhost:8080";

const api = axios.create({
    baseURL : API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    wihtCredentials: true
});

//Response Interceptor for Global error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        //Global Error Handling
        if(error.response){
            switch(error.response.status){
                case 401 : //Unauthorized
                    authService.logout();
                    window.location.href='/login';
                    break;
                case 403 : // access Forbidden
                    console.error("Access forbidden");
                    break
                case 404 : //Resource Not found
                    console.error("Resource NOt Found");
                    break;
                case 500 : //Internal server error
                    console.error("Internal Server Error");
                    break;
            }
        } 
        else if(error.request){
            console.error("Request made but didn't get the response " + error.request);
        }
        else{
            console.error("Something happen in the request " + error.message);
        }
        return Promise.reject(error);
    }
);

const generateUserColor = () => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4','#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ]
    return colors[Math.floor(Math.random() * colors.length)];
}

export const authService = {

    login: async (username, password) => {

        try{

            const response = await api.post('/auth/login', {
                username,
                password
            });

            //After login
            const useColor = generateUserColor();
            const userData = {
                ...response.data,
                color: useColor,
                loginTime: new Date().toISOString()
            };

            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('user', JSON.stringify(response.data));

            return{
                success: true,
                user: userData
            };

        }
        catch(error){

            console.error('Login failed', error);
            const errorMessage = error.response?.data?.message || 'Login failed, Please check your credentials';
            throw new errorMessage;

        }
    },

    signup: async(username, email, password) => {

        try{

            const response = await api.post('/auth/signup', {
                username,
                email,
                password
            });

            return{
                success: true,
                user: response.data
            };
        }
        catch (error){
            console.error('Signup failed', error);
            const errorMessage = error.response?.data?.message || 'Signup failed, Please check your credentials';
            throw new errorMessage;
        }
    },

    logout: async() => {
        try{
            await api.post('/auth/logout');
        }
        catch(error){
            console.error('Logout failed', error);
        }
        finally{
            localStorage.removeItem('currentUser');
            localStorage.removeItem('user');
        }
    },

    fetchCurrentUser: async() => {

        try{

            const response = await api.get('/auth/getcurrentuser');

            localStorage.setItem('user', JSON.stringify(response.data));
            return response.data;
        }
        catch(error){
            console.error('Error fetching user data', error);

            if(error, reponse && error.response.status === 401){
                await authService.logout();
            }
        }
    },

    getCurrentUser: () => {

        const currentUserStr = localStorage.getItem('currentUser');
        const userStr = localStorage.getItem('user');

        try{
            if(currentUserStr){
                return JSON.parse(currentUserStr);
            }
            else if(useStr){
                const userData = JSON.parse(userStr);
                const userColor = generateUserColor();

                return{
                    ...userData,
                    color: userColor
                };
            }
            return null;
        }
        catch (error){
            console.error('Error parsing user data', error);
            return null;
        }
    },

    isAuthenticated: () => {
        const user = localStorage.getItem('user') || localStorage.getItem('currentUser');
        return !!user;
    },

    fetchPrivateMessages: async(user1, user2) => {
        try{

            const response = await api.get(`/api/messages/private?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`);
            return response.data;
        }
        catch(error){
            console.error('Error in fetching private messages', error);
            throw error;
        }
    },

    getOnlineUsers: async() => {

        try{
            const response = await api.get('/auth/getonlineusers');
            return response.data;
        }
        catch (error){
            console.error("Error in Fetching in online users", error);
            throw error;
        }
    }


}

