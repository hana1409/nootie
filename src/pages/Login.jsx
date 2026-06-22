import { Link } from "react-router-dom";
import illustration from "../assets/login-illustration.png";
import { Mail, Lock } from "lucide-react";

export default function Login() {
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
              <Mail
                size={20}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="email"
                placeholder="Email Address"
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
                className="w-full h-16 pl-14 rounded-2xl border border-gray-200 outline-none"
              />
            </div>

            <button className="w-full h-16 bg-[#A12259] hover:bg-[#8b1d4d] text-white rounded-2xl text-xl font-medium transition">
              Login
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