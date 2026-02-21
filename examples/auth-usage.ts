/**
 * Example usage of authentication endpoints
 * This file demonstrates how to use the authentication API
 */

import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

// Example 1: Register a new user
async function registerUser() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: 'newuser@example.com',
      password: 'securepassword123',
      role: 'customer',
    })

    console.log('User registered successfully:', response.data)
    return response.data.data.user
  } catch (error: any) {
    console.error('Registration failed:', error.response?.data || error.message)
    throw error
  }
}

// Example 2: Login and get tokens
async function loginUser() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'newuser@example.com',
      password: 'securepassword123',
    })

    console.log('Login successful')
    const { accessToken, refreshToken, expiresIn } = response.data.data
    console.log('Access token expires in:', expiresIn, 'seconds')

    return { accessToken, refreshToken }
  } catch (error: any) {
    console.error('Login failed:', error.response?.data || error.message)
    throw error
  }
}

// Example 3: Refresh access token
async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    })

    console.log('Token refreshed successfully')
    return response.data.data.accessToken
  } catch (error: any) {
    console.error('Token refresh failed:', error.response?.data || error.message)
    throw error
  }
}

// Example 4: Generate API key
async function generateAPIKey(accessToken: string) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/api-key`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    console.log('API key generated:', response.data.data.apiKey.key)
    return response.data.data.apiKey.key
  } catch (error: any) {
    console.error('API key generation failed:', error.response?.data || error.message)
    throw error
  }
}

// Example 5: Logout
async function logoutUser(accessToken: string) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    console.log('Logout successful:', response.data.message)
  } catch (error: any) {
    console.error('Logout failed:', error.response?.data || error.message)
    throw error
  }
}

// Example 6: Using API key for authentication
async function useAPIKey(apiKey: string) {
  try {
    // Example: Call a protected endpoint with API key
    const response = await axios.get(`${API_BASE_URL}/some-protected-endpoint`, {
      headers: {
        'X-API-Key': apiKey,
      },
    })

    console.log('API call with API key successful:', response.data)
    return response.data
  } catch (error: any) {
    console.error('API call failed:', error.response?.data || error.message)
    throw error
  }
}

// Complete authentication flow example
async function completeAuthFlow() {
  try {
    console.log('=== Starting Complete Authentication Flow ===\n')

    // Step 1: Register
    console.log('Step 1: Registering user...')
    await registerUser()
    console.log('✓ Registration complete\n')

    // Step 2: Login
    console.log('Step 2: Logging in...')
    const { accessToken, refreshToken } = await loginUser()
    console.log('✓ Login complete\n')

    // Step 3: Generate API key
    console.log('Step 3: Generating API key...')
    const apiKey = await generateAPIKey(accessToken)
    console.log('✓ API key generated\n')

    // Step 4: Refresh token (simulating token expiration)
    console.log('Step 4: Refreshing access token...')
    const newAccessToken = await refreshAccessToken(refreshToken)
    console.log('✓ Token refreshed\n')

    // Step 5: Logout
    console.log('Step 5: Logging out...')
    await logoutUser(newAccessToken)
    console.log('✓ Logout complete\n')

    console.log('=== Authentication Flow Complete ===')
  } catch (error) {
    console.error('Authentication flow failed:', error)
  }
}

// Run the complete flow if this file is executed directly
if (require.main === module) {
  completeAuthFlow()
}

export {
  registerUser,
  loginUser,
  refreshAccessToken,
  generateAPIKey,
  logoutUser,
  useAPIKey,
  completeAuthFlow,
}
