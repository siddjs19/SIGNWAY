import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Mail, Lock, UserRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messageOf } from '../lib/api';
export default function Auth({mode}) {
 const registerMode=mode==='register', {login,register}=useAuth(), nav=useNavigate();
 const [form,setForm]=useState({name:'',email:'',password:''}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const change=e=>setForm({...form,[e.target.name]:e.target.value});
 const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{registerMode?await register(form):await login({email:form.email,password:form.password});nav('/app')}catch(err){setError(messageOf(err))}finally{setBusy(false)}};
 return <div className="auth-page"><div className="auth-decoration deco-one"/><div className="auth-decoration deco-two"/><div className="auth-card"><div className="auth-brand"><div className="brand-mark"><Sparkles/></div><b>SignBridge<span> AI</span></b><p>Learn, connect, and empower through ISL.</p></div><div className="auth-title"><h1>{registerMode?'Create your account':'Welcome back'}</h1><p>{registerMode?'Start your Indian Sign Language journey.':'Continue your learning journey.'}</p></div>
 <form onSubmit={submit}>{registerMode&&<label>Full name<div className="input-wrap"><UserRound size={18}/><input name="name" value={form.name} onChange={change} placeholder="Your name" required minLength="2"/></div></label>}<label>Email address<div className="input-wrap"><Mail size={18}/><input type="email" name="email" value={form.email} onChange={change} placeholder="you@example.com" required/></div></label><label>Password<div className="input-wrap"><Lock size={18}/><input type="password" name="password" value={form.password} onChange={change} placeholder="At least 8 characters" required minLength="8"/></div></label>{error&&<div className="form-error">{error}</div>}<button className="btn btn-primary btn-full" disabled={busy}>{busy?'Please wait...':registerMode?'Create account':'Sign in'} <ArrowRight size={17}/></button></form>
 <div className="auth-switch">{registerMode?'Already have an account?':'New to SignBridge?'} <Link to={registerMode?'/login':'/register'}>{registerMode?'Sign in':'Create account'}</Link></div><div className="auth-foot">A more connected world starts with understanding.</div></div></div>
}
