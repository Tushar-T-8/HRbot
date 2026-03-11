import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        department: '',
        role: 'EMPLOYEE',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signup(form);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const departments = ['Engineering', 'Human Resources', 'Marketing', 'Finance', 'Operations', 'Sales', 'Design'];

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-stone-100 px-4 py-10">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-900 mb-4 shadow-lg shadow-gray-900/20">
                        <span className="text-xl font-bold text-white">H</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create your account</h1>
                    <p className="text-sm text-gray-500 mt-1">Join the HR Assistant platform</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    {error && (
                        <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                            <input
                                id="name"
                                type="text"
                                value={form.name}
                                onChange={update('name')}
                                required
                                placeholder="John Doe"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                            />
                        </div>

                        <div>
                            <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                            <input
                                id="signup-email"
                                type="email"
                                value={form.email}
                                onChange={update('email')}
                                required
                                placeholder="you@company.com"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                            />
                        </div>

                        <div>
                            <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                            <input
                                id="signup-password"
                                type="password"
                                value={form.password}
                                onChange={update('password')}
                                required
                                minLength={6}
                                placeholder="Min. 6 characters"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                            />
                        </div>

                        <div>
                            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                            <select
                                id="department"
                                value={form.department}
                                onChange={update('department')}
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                            >
                                <option value="" disabled>Select department</option>
                                {departments.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        {/* Role Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'EMPLOYEE', label: 'Employee', desc: 'Chat with HR AI' },
                                    { value: 'HR', label: 'HR Admin', desc: 'Manage dashboard' },
                                ].map((r) => (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => setForm({ ...form, role: r.value })}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${form.role === r.value
                                                ? 'border-gray-900 bg-gray-50'
                                                : 'border-gray-100 hover:border-gray-200'
                                            }`}
                                    >
                                        <span className={`text-sm font-semibold ${form.role === r.value ? 'text-gray-900' : 'text-gray-600'}`}>
                                            {r.label}
                                        </span>
                                        <p className="text-[11px] text-gray-400 mt-0.5">{r.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating account...
                                </span>
                            ) : (
                                'Create account'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-gray-900 font-semibold hover:underline">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
