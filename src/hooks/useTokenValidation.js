import { useEffect } from 'react';
import { jwtDecode } from "jwt-decode";

const useTokenValidation = () => {
  // Function to check if the token is expired
  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000; // Current time in seconds
        console.log('Decoded JWT:', decoded); // Debugging log
        return decoded.exp < currentTime; // Token is expired if `exp` is less than current time
    } catch (error) {
        console.error('Failed to decode token', error);
        return true; // Assume token is expired if decoding fails
    }
};

  // Log the user out if the token is expired
  const handleLogout = () => {
    // Remove the token from local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('lastPage'); // Optional, if you stored the last page

    // Redirect to the logout page (Shibboleth logout)
    window.location.href = `https://libtools2.smith.edu/gadgets-to-go/backend/admin-logout/logout.php`;
  };

  // Check token validity on component mount
  useEffect(() => {
    const token = localStorage.getItem('authToken'); // Get token from local storage
    if (isTokenExpired(token)) {
      handleLogout();
    }
  }, []); // Empty dependency array ensures this runs on mount only

  // Optionally, return any functions you might want to use elsewhere
  return { isTokenExpired, handleLogout };
};

export default useTokenValidation;
