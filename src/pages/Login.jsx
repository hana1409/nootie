import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import illustration from "../assets/login-illustration.png";
import { User, Lock } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      alert("Mohon lengkapi semua field");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        { username, password }
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-6">

      <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-12 items-center">

        {/* Left */}
        <div className="flex justify-center">
          <img
            src={illustration}
            alt="Login Illustration"
            className="w-full max-w-[550px]"
          />
        </div>

        {/* Right */}
        <div className="max-w-md w-full mx-auto">

          <h1 className="text-5xl font-bold text-[#252525] mb-4">
            Hello Again!
          </h1>

          <p className="text-gray-500 mb-10 text-lg">
            Welcome Back
          </p>

          <div className="space-y-6">

            <div className="relative">
              <User
                size={20}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-16 pl-14 rounded-2xl border border-gray-200 outline-none"
              />
            </div>

            <div className="relative">
              <Lock
                size={20}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-16 pl-14 rounded-2xl border border-gray-200 outline-none"
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-16 bg-[#A12259] hover:bg-[#8b1d4d] disabled:opacity-60 text-white rounded-2xl text-xl font-medium transition"
            >
              {loading ? "Loading..." : "Login"}
            </button>

            <div className="text-center text-gray-500 cursor-pointer">
              Forgot Password
            </div>

            <div className="text-center">
              <span className="text-gray-600">
                New Nootie?
              </span>

              <Link
                to="/register"
                className="ml-2 text-[#A12259] font-semibold"
              >
                create account
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}