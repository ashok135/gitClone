import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { setUser, setLoading, setError, logout as logoutAction } from '../store/slices/authSlice';
import type { User } from '../types/auth';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || "Ov23liwT45BuLxh6B0Df";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, error } = useSelector((state: RootState) => state.auth);

  // TODO: 1. Load cached user from localStorage on mount
  useEffect(() => {
    const cachedUser = localStorage.getItem("oauth_user");
    if (cachedUser) {
      try {
        dispatch(setUser(JSON.parse(cachedUser) as User));
      } catch (e) {
        localStorage.removeItem("oauth_user");
        localStorage.removeItem("oauth_token");
      }
    }
  }, [dispatch]);

  // TODO: 2. Handle both redirect callback styles (Backend redirect vs Frontend direct)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const userJson = urlParams.get("user");
    const code = urlParams.get("code");

    if (token && userJson) {
      // Flow A: Backend redirect callback
      try {
        const decodedUser = JSON.parse(decodeURIComponent(userJson)) as User;
        localStorage.setItem("oauth_token", token);
        localStorage.setItem("oauth_user", JSON.stringify(decodedUser));
        dispatch(setUser(decodedUser));
      } catch (err: any) {
        console.error("Failed to parse redirect user:", err);
        dispatch(setError("Failed to initialize user session."));
      } finally {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } else if (code) {
      // Flow B: Frontend-direct code exchange
      const exchangeCode = async () => {
        dispatch(setLoading(true));
        dispatch(setError(null));
        try {
          const response = await fetch(`${API_URL}/api/auth/github`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to exchange authorization code");
          }

          const data = await response.json() as { token: string; user: User };
          
          localStorage.setItem("oauth_token", data.token);
          localStorage.setItem("oauth_user", JSON.stringify(data.user));
          
          dispatch(setUser(data.user));
        } catch (err: any) {
          console.error("Authentication Error:", err);
          dispatch(setError(err.message || "Failed to log in with GitHub."));
        } finally {
          dispatch(setLoading(false));
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      };

      exchangeCode();
    }
  }, [dispatch]);

  const login = () => {
    if (GITHUB_CLIENT_ID === "your_github_client_id_here") {
      alert("Please configure VITE_GITHUB_CLIENT_ID in your frontend .env file!");
      return;
    }
    // Redirect through the backend redirect callback URL registered in GitHub Developer settings
    const redirectUri = `${API_URL}/api/auth/github/callback`;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=repo,read:user`;
  };

  const logout = () => {
    localStorage.removeItem("oauth_user");
    localStorage.removeItem("oauth_token");
    dispatch(logoutAction());
  };

  const setReduxError = (val: string | null) => {
    dispatch(setError(val));
  };

  return { user, loading, error, setError: setReduxError, login, logout };
}
