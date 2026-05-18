export default function Login({ api }) {
  return (<div className="login-page"><div className="login-card"><h1>🏢 Reserva de Salas</h1><p>Ingresá con tu cuenta de trabajo para reservar salas.</p><div className="login-buttons"><a href={`${api}/auth/google`} className="btn"><img src="https://www.google.com/favicon.ico" width={16} alt="" />Continuar con Gmail</a><a href={`${api}/auth/microsoft`} className="btn"><img src="https://www.microsoft.com/favicon.ico" width={16} alt="" />Continuar con Outlook</a></div></div></div>)
}
