import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  RefreshCw,
  Shield,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import AppSidebar from '../components/AppSidebar';
import api from '../services/api';
import './Dashboard.css';

const card = 'rounded-3xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.7)] shadow-sm backdrop-blur-xl';
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sb-signal to-[#48e2d6] px-5 py-2.5 text-sm font-extrabold text-sb-midnight transition hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(92,225,214,0.2)] bg-[rgba(24,48,65,0.6)] px-4 py-2.5 text-sm font-bold text-sb-signal transition hover:border-sb-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal disabled:cursor-not-allowed disabled:opacity-50';

async function requestCredentials() {
  const response = await api.get('/credentials');
  return response.data.data;
}

function PageError({ children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100" role="alert">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function CredentialStatus({ status }) {
  const statusMap = {
    pending: { text: 'Pending blockchain transaction', icon: RefreshCw, color: 'text-amber-100' },
    issued: { text: 'Confirmed on-chain', icon: CheckCircle2, color: 'text-emerald-100' },
    revoked: { text: 'Revoked on-chain', icon: ShieldAlert, color: 'text-red-200' },
    failed: { text: 'Issuance failed', icon: XCircle, color: 'text-red-200' },
  };
  const item = statusMap[status] || statusMap.pending;
  const Icon = item.icon;
  return <span className={`inline-flex items-center gap-2 text-sm font-bold ${item.color}`}><Icon size={16} />{item.text}</span>;
}

export default function CredentialsPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await requestCredentials());
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onLogout();
        return;
      }
      setError(requestError.response?.data?.message || 'Credentials could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    let active = true;
    async function loadInitialCredentials() {
      try {
        const credentials = await requestCredentials();
        if (active) setData(credentials);
      } catch (requestError) {
        if (active && requestError.response?.status === 401) {
          onLogout();
        } else if (active) {
          setError(requestError.response?.data?.message || 'Credentials could not be loaded.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialCredentials();
    return () => {
      active = false;
    };
  }, [onLogout]);

  async function issueCredential() {
    setAction('issue');
    setError('');
    setNotice('');
    try {
      const response = await api.post('/credentials/issue');
      setNotice(response.data.message || (
        response.data.pending
          ? 'Transaction submitted. Verify again after the network confirms it.'
          : 'Credential is confirmed.'
      ));
      await loadCredentials();
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onLogout();
        return;
      }
      setError(requestError.response?.data?.message || 'Credential issuance could not be started.');
    } finally {
      setAction('');
    }
  }

  async function verifyCredential(credentialId) {
    setAction(credentialId);
    setError('');
    setNotice('');
    try {
      const response = await api.get(`/credentials/verify/${credentialId}`);
      setNotice(response.data.data.verified
        ? 'Credential matched the confirmed on-chain contract record.'
        : `Verification status: ${response.data.data.status || 'not found'}.`);
      await loadCredentials();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Credential verification could not be completed.');
    } finally {
      setAction('');
    }
  }

  function navigateSidebar(id) {
    if (id === 'quizzes') navigate('/quiz');
    else if (id === 'practitioners') navigate('/practitioners');
    else navigate('/', { state: { activeNav: id } });
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-sb-midnight bg-[radial-gradient(at_0%_0%,rgba(146,117,255,0.12)_0px,transparent_45%),radial-gradient(at_100%_100%,rgba(92,225,214,0.1)_0px,transparent_45%)] text-sb-body">
      <AppSidebar activeNav="credentials" user={user} onNavigate={navigateSidebar} onLogout={onLogout} />
      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[rgba(92,225,214,0.14)] bg-[rgba(7,20,33,0.85)] px-5 py-4 backdrop-blur-xl sm:px-8">
          <span className="text-sm text-sb-muted">Credentials · {user?.name || 'Learner'}</span>
          <span className="sb-integration-language">MST Coral Testnet · chain 54635</span>
        </header>
        <div className="mx-auto flex w-full max-w-350 flex-col gap-7 p-5 sm:p-8 lg:px-9">
          <header>
            <div className="sb-integration-section-heading">
              <h1 className="sb-integration-page-title">My Credentials</h1>
              <span className="sb-lesson-badge badge-active">MST Coral Testnet</span>
            </div>
            <p className="sb-integration-muted mt-2">
              Verifiable proof stores only a credential hash and issuer metadata on-chain. Learner identity,
              name, email, grades, and lesson details remain off-chain.
            </p>
          </header>

          <div className="sb-integration-contract">
            <Shield size={18} />
            <span>Testnet credentials are not production certificates. “Pending” is not verified; only a confirmed contract record whose hash matches SignBridge data can be verified. Testnet activity has no real-world credential value.</span>
          </div>

          {error && <PageError>{error}</PageError>}
          {notice && <p className="rounded-xl border border-sb-signal/20 bg-sb-signal/5 p-4 text-sm text-sb-body" role="status">{notice}</p>}

          <section className={`${card} p-5 sm:p-7`} aria-labelledby="eligibility-title">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-3xl">
                <h2 id="eligibility-title" className="text-xl font-extrabold text-sb-soft">Available achievement</h2>
                <p className="mt-2 text-lg font-bold text-sb-signal">ISL Learning Path Completed</p>
                {data?.eligibility && (
                  <>
                    <p className="mt-2 text-sm text-sb-muted">
                      Existing SignBridge milestone: {data.eligibility.completedLessons}/{data.eligibility.totalLessons} currently published lessons completed.
                    </p>
                    <p className="mt-1 text-sm text-sb-muted">
                      {data.eligibility.eligible ? 'Eligible to request issuance.' : data.eligibility.reason}
                    </p>
                  </>
                )}
              </div>
              <button
                type="button"
                className={button}
                onClick={issueCredential}
                disabled={loading || action !== '' || !data?.eligibility?.eligible || !data?.network?.issuanceConfigured}
                title={!data?.network?.issuanceConfigured ? 'Registry contract and backend issuer are not configured.' : undefined}
              >
                {action === 'issue' ? 'Submitting…' : 'Issue credential'}
              </button>
            </div>
            {!data?.network?.issuanceConfigured && (
              <p className="mt-4 text-sm text-amber-100" role="status">
                Blockchain issuance is not configured yet. A Coral contract address and backend-only issuer key are required.
              </p>
            )}
          </section>

          <section aria-labelledby="my-credentials-title">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="my-credentials-title" className="text-xl font-extrabold text-sb-soft">Credential records</h2>
              <button type="button" className={secondaryButton} onClick={loadCredentials} disabled={loading}>
                <RefreshCw size={15} /> Refresh
              </button>
            </div>
            {loading ? (
              <div className={`${card} flex items-center gap-3 p-6 text-sb-muted`} role="status">
                <span className="size-5 animate-spin rounded-full border-2 border-sb-signal border-t-transparent" /> Loading credentials…
              </div>
            ) : !data?.credentials?.length ? (
              <div className={`${card} flex flex-col items-center gap-3 p-8 text-center text-sb-muted`}>
                <FileCheck size={30} className="text-sb-signal" />
                <h3 className="font-bold text-sb-soft">No credentials issued</h3>
                <p>When the existing learning-path milestone is eligible and the testnet contract is configured, an issuance request can be submitted here.</p>
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-4 p-0">
                {data.credentials.map((credential) => {
                  const explorerBase = data.network.explorerUrl.replace(/\/+$/, '');
                  return (
                    <li key={credential.credentialId} className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-extrabold text-sb-soft">ISL Learning Path Completed</h3>
                          <p className="mt-1 text-xs text-sb-muted">Credential ID: <code className="break-all">{credential.credentialId}</code></p>
                        </div>
                        <CredentialStatus status={credential.status} />
                      </div>
                      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div><dt className="text-sb-muted">Credential hash</dt><dd className="mt-1 break-all font-mono text-xs text-sb-body">{credential.credentialHash}</dd></div>
                        <div><dt className="text-sb-muted">Issuer</dt><dd className="mt-1 break-all font-mono text-xs text-sb-body">{credential.issuerAddress}</dd></div>
                        <div><dt className="text-sb-muted">Issued at</dt><dd className="mt-1 text-sb-body">{credential.issuedAt ? new Date(credential.issuedAt).toLocaleString() : 'Awaiting confirmation'}</dd></div>
                        <div><dt className="text-sb-muted">Network / contract</dt><dd className="mt-1 break-all text-sb-body">Chain {credential.networkChainId} · {credential.contractAddress}</dd></div>
                      </dl>
                      {credential.transactionHash && (
                        <p className="break-all text-sm text-sb-body">
                          Transaction: <code className="font-mono text-xs">{credential.transactionHash}</code>
                          {' '}<a className="inline-flex items-center gap-1 text-sb-signal underline" href={`${explorerBase}/tx/${credential.transactionHash}`} target="_blank" rel="noreferrer">MSTScan <ExternalLink size={13} /></a>
                        </p>
                      )}
                      {credential.revocationTransactionHash && (
                        <p className="break-all text-sm text-sb-body">
                          Revocation transaction: <code className="font-mono text-xs">{credential.revocationTransactionHash}</code>
                          {' '}<a className="inline-flex items-center gap-1 text-sb-signal underline" href={`${explorerBase}/tx/${credential.revocationTransactionHash}`} target="_blank" rel="noreferrer">MSTScan <ExternalLink size={13} /></a>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 border-t border-[rgba(92,225,214,0.12)] pt-4">
                        <Link className={secondaryButton} to={credential.verificationUrl}>Share verification <ExternalLink size={14} /></Link>
                        <button type="button" className={secondaryButton} onClick={() => verifyCredential(credential.credentialId)} disabled={action !== ''}>
                          {action === credential.credentialId ? 'Verifying…' : 'Verify on-chain'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <p className="text-xs text-sb-muted">Native testnet currency: tMSTC. Do not send real funds to testnet addresses.</p>
        </div>
      </main>
    </div>
  );
}

export function PublicCredentialVerificationPage() {
  const { credentialId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function verify() {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/credentials/verify/${credentialId}`);
        if (active) setData(response.data.data);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Credential verification is unavailable.');
      } finally {
        if (active) setLoading(false);
      }
    }
    verify();
    return () => {
      active = false;
    };
  }, [credentialId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-sb-midnight p-5 text-sb-body">
      <section className={`${card} w-full max-w-2xl p-6 sm:p-9`}>
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-sb-signal"><ArrowLeft size={16} /> SignBridge</Link>
        <p className="text-xs font-bold uppercase tracking-widest text-sb-signal">Public credential verification</p>
        <h1 className="mt-2 text-2xl font-extrabold text-sb-soft">ISL Learning Path credential</h1>
        {loading && <p className="mt-5 text-sb-muted" role="status">Checking MST Coral Testnet…</p>}
        {error && <div className="mt-5"><PageError>{error}</PageError></div>}
        {!loading && !error && data && (
          <div className="mt-5 flex flex-col gap-4">
            {!data.exists ? (
              <p className="text-amber-100" role="status">No matching confirmed credential was found on the configured network.</p>
            ) : (
              <>
                <CredentialStatus status={data.status} />
                <p className={data.verified ? 'text-emerald-100' : 'text-amber-100'} role="status">
                  {data.verified
                    ? 'Verified: the confirmed on-chain hash matches SignBridge’s credential record.'
                    : 'This credential is not currently verified as an active on-chain credential.'}
                </p>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-sb-muted">Credential ID</dt><dd className="mt-1 break-all font-mono text-xs">{data.credentialId}</dd></div>
                  <div><dt className="text-sb-muted">Credential hash</dt><dd className="mt-1 break-all font-mono text-xs">{data.credentialHash}</dd></div>
                  <div><dt className="text-sb-muted">Issuer</dt><dd className="mt-1 break-all font-mono text-xs">{data.issuerAddress}</dd></div>
                  <div><dt className="text-sb-muted">Network</dt><dd className="mt-1">MST Coral · chain {data.networkChainId}</dd></div>
                  <div><dt className="text-sb-muted">Issue time</dt><dd className="mt-1">{data.issuedAt ? new Date(data.issuedAt).toLocaleString() : 'Pending'}</dd></div>
                  {data.revokedAt && <div><dt className="text-sb-muted">Revoked at</dt><dd className="mt-1">{new Date(data.revokedAt).toLocaleString()}</dd></div>}
                </dl>
                {data.transactionHash && (
                  <a className="inline-flex items-center gap-2 text-sb-signal underline" href={`${data.explorerUrl}/tx/${data.transactionHash}`} target="_blank" rel="noreferrer">
                    View transaction on MSTScan <ExternalLink size={14} />
                  </a>
                )}
                {data.revocationTransactionHash && (
                  <a className="inline-flex items-center gap-2 text-sb-signal underline" href={`${data.explorerUrl}/tx/${data.revocationTransactionHash}`} target="_blank" rel="noreferrer">
                    View revocation on MSTScan <ExternalLink size={14} />
                  </a>
                )}
              </>
            )}
            <p className="border-t border-[rgba(92,225,214,0.12)] pt-4 text-xs text-sb-muted">
              Public verification reveals the credential proof only. Learner identity and course data are not included on-chain or shown here.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
