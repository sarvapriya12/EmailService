import axios from 'axios'
import { getToken, logout } from './auth'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})


// Attach token to every request and handle 401 responses globally and redirect to login
// This ensures that if the token expires or is invalid, the user will be logged out and prompted to log in again, improving security and user experience.
// Note: In a production application, you might want to handle token refresh logic here as well, to automatically obtain a new token when the current one expires without forcing the user to log in again.
api.interceptors.request.use(async (config) => {
  const token = await getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})


// This response interceptor checks for 401 Unauthorized responses from the API.
//  If such a response is detected, it triggers the logout function to clear any
// stored authentication tokens and then redirects the user to the login page.
//  This ensures that users are prompted to re-authenticate if their session has
//  expired or if they are unauthorized, enhancing security and user experience.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
