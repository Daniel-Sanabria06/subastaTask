import { Link } from 'react-router-dom';

const Terminos = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Términos y Condiciones</h1>
      <p className="mb-4">Estos términos regulan el uso de SubastaTask por parte de clientes y trabajadores. Al acceder o usar la plataforma, aceptas estos términos.</p>

      <div className="bg-gray-50 border rounded shadow p-5 mb-6">
        <p className="font-semibold mb-2">Resumen</p>
        <p className="mb-3">En forma resumida, el uso de SubastaTask implica:</p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Proveer información veraz y mantener segura tu cuenta.</li>
          <li>Usar la plataforma de manera lícita y respetuosa.</li>
          <li>Publicar y ofertar con honestidad y transparencia.</li>
          <li>Respetar las normas en chats y reseñas; evitar datos personales de terceros.</li>
          <li>Aceptar que podemos moderar contenido y actualizar estos términos.</li>
        </ul>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Aceptación de Términos</h2>
      <p className="mb-2">Al ingresar o usar SubastaTask lo haces bajo tu responsabilidad y aceptas sin reservas estos términos. Podemos actualizarlos de forma unilateral cuando sea necesario; te informaremos cambios relevantes.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Definiciones</h2>
      <p className="mb-2">Cliente: usuario que crea publicaciones solicitando servicios. Trabajador: usuario que oferta y presta servicios. Cuenta: registro asociado a tu correo y datos de perfil.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Registro y Cuenta</h2>
      <p className="mb-2">Debes proporcionar información veraz y mantener tus credenciales seguras. Podemos suspender cuentas que incumplan normas, generen fraude o afecten la seguridad.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Uso Aceptable</h2>
      <p className="mb-2">No puedes usar la plataforma para actividades ilícitas, enviar spam, acosar, vulnerar propiedad intelectual o intentar acceder sin autorización a datos de otros usuarios.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Obligaciones del Usuario</h2>
      <ul className="list-disc ml-6 space-y-2 mb-2">
        <li>Usar los contenidos de manera diligente, correcta y lícita.</li>
        <li>No suprimir ni alterar avisos de propiedad intelectual o identificadores.</li>
        <li>No bloquear, interferir o impedir el normal funcionamiento del sitio o sus servicios.</li>
        <li>No enviar información ofensiva, difamatoria, discriminatoria o ilegal hacia la plataforma o sus usuarios.</li>
        <li>Abstenerse de conductas ilícitas como ataques informáticos, interceptación de comunicaciones, usurpación de identidad o falsedad documental.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. Publicaciones y Ofertas</h2>
      <p className="mb-2">Las publicaciones deben describir con claridad el servicio. Las ofertas deben ser honestas y cumplir las leyes aplicables. Nos reservamos el derecho de moderar contenido.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">7. Chats y Mensajes</h2>
      <p className="mb-2">Los chats son privados entre participantes. No compartas datos sensibles innecesarios. Podemos limitar el uso si se detecta abuso.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">8. Reseñas y Calificaciones</h2>
      <p className="mb-2">Las reseñas deben ser respetuosas y basadas en experiencias reales. No se permiten difamaciones, lenguaje ofensivo ni datos personales de terceros.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">9. Pagos y Transacciones</h2>
      <p className="mb-2">Si existen transacciones fuera de la plataforma, SubastaTask no es parte de la relación contractual ni responsable de pagos, reembolsos o disputas externas.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">10. Propiedad Intelectual (Copyright)</h2>
      <p className="mb-2">El contenido institucional de SubastaTask (textos, gráficos, logos y elementos audiovisuales) es de su propiedad o licencia. Se prohíbe su reproducción, traducción, transmisión, almacenamiento o acceso por medios no autorizados. Puedes descargar material únicamente para uso personal y no comercial, mencionando la propiedad de SubastaTask.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">11. Privacidad y Seguridad</h2>
      <p className="mb-2">Protegemos datos mediante controles técnicos y de acceso. Consulta la <Link to="/privacidad" className="link-primary">Política de Privacidad</Link> para conocer cómo tratamos tus datos.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">12. Limitación de Responsabilidad</h2>
      <p className="mb-2">La plataforma se ofrece “tal cual”. No garantizamos resultados específicos y no respondemos por daños indirectos derivados del uso del servicio.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">13. Modificaciones</h2>
      <p className="mb-2">Podemos actualizar estos términos para reflejar cambios legales o de servicio. Te notificaremos actualizaciones relevantes.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">14. Terminación</h2>
      <p className="mb-2">Podemos suspender o terminar cuentas que infrinjan normas. Puedes solicitar la eliminación de tu cuenta conforme a nuestra política de privacidad.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">15. Contacto</h2>
      <p className="mb-2">Para soporte o consultas legales, contáctanos a info@subastask.com.</p>

      <div className="mt-6">
        <Link to="/register" className="link-primary">Volver al registro</Link>{' '}
        <Link to="/privacidad" className="link-primary">Ver Política de Privacidad</Link>
      </div>
    </div>
  );
};

export default Terminos;
