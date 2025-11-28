import { Link } from 'react-router-dom';

const Privacidad = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Política de Privacidad</h1>
      <p className="mb-4">Esta política explica cómo SubastaTask recopila, utiliza y protege tus datos personales.</p>

      <div className="bg-gray-50 border rounded shadow p-5 mb-6">
        <p className="font-semibold mb-2">Resumen</p>
        <p className="mb-3">De manera resumida, el tratamiento de datos implica:</p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Usamos tus datos para operar el servicio, verificar identidad y habilitar funcionalidades.</li>
          <li>No compartimos tus datos con terceros salvo proveedores tecnológicos necesarios y obligaciones legales.</li>
          <li>Los datos que recibimos de aplicaciones de terceros se usan como mecanismos de autenticación o integración.</li>
        </ul>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Fundamento y Alcance</h2>
      <p className="mb-2">Aplica a clientes y trabajadores que usan la plataforma y sus funciones asociadas.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Datos que Recopilamos</h2>
      <p className="mb-2">Datos de registro (nombre, correo, documento, ciudad, edad), datos de perfil profesional (profesión, habilidades, teléfono), actividad (publicaciones, ofertas, chats, reseñas) y metadatos técnicos.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Finalidades</h2>
      <p className="mb-2">Operar la plataforma, facilitar la conexión entre clientes y trabajadores, mejorar funcionalidades, prevenir fraude y cumplir obligaciones legales.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Base Legal</h2>
      <p className="mb-2">Consentimiento al registrarte y aceptar términos, ejecución de la relación contractual y cumplimiento normativo aplicable.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Compartir Datos y Transferencias</h2>
      <p className="mb-2">No vendemos tus datos. Compartimos de forma limitada con proveedores tecnológicos necesarios para operar el servicio y, cuando aplica, con autoridades.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. Conservación</h2>
      <p className="mb-2">Conservamos datos el tiempo necesario para la prestación del servicio y según requisitos legales. Puedes solicitar eliminación conforme a la sección de derechos.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">7. Derechos de los Titulares</h2>
      <p className="mb-2">Puedes ejercer derechos de acceso, rectificación, eliminación y oposición escribiendo a info@subastask.com. Verificaremos tu identidad antes de atender solicitudes.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">8. Seguridad de la Información</h2>
      <p className="mb-2">Aplicamos controles técnicos y organizativos, incluyendo políticas de acceso por fila (RLS), para proteger la información contra accesos no autorizados.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">9. Cookies</h2>
      <p className="mb-2">Usamos cookies esenciales y de rendimiento para mantener sesiones y mejorar la experiencia. Puedes ajustar preferencias desde tu navegador.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">10. Menores</h2>
      <p className="mb-2">El servicio no está dirigido a menores de edad. Si detectamos registros de menores, eliminaremos la cuenta.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">11. Cambios y Vigencia</h2>
      <p className="mb-2">Podemos actualizar esta política. Notificaremos cambios relevantes en la plataforma.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">12. Contacto</h2>
      <p className="mb-2">Para consultas de privacidad, escribe a info@subastask.com.</p>

      <div className="mt-6">
        <Link to="/register" className="link-primary">Volver al registro</Link>{' '}
        <Link to="/terminos" className="link-primary">Ver Términos y Condiciones</Link>
      </div>
    </div>
  );
};

export default Privacidad;
