import { LoaderCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
export function PageHeading({eyebrow,title,description,action}){return <div className="page-heading"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{action&&<div>{action}</div>}</div>}
export function Loading({label='Loading...'}){return <div className="state-box"><LoaderCircle className="spin" size={24}/><span>{label}</span></div>}
export function Empty({title,description}){return <div className="empty-state"><div className="empty-icon"><AlertCircle/></div><b>{title}</b><p>{description}</p></div>}
export function ErrorState({message,onRetry}){return <div className="error-state"><AlertCircle size={19}/><span>{message}</span>{onRetry&&<button className="text-btn" onClick={onRetry}>Retry</button>}</div>}
export function StatCard({label,value,detail,icon:Icon,tint='violet'}){return <div className="stat-card"><div className={`stat-icon ${tint}`}><Icon size={20}/></div><div><span>{label}</span><strong>{value??'—'}</strong><small>{detail||'From your learning activity'}</small></div></div>}
export function Status({children,tone='neutral'}){return <span className={`status status-${tone}`}><i/>{children}</span>}
