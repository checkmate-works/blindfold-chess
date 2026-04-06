const content = `# Precauciones sobre el manejo de datos

## Datos almacenados en el navegador

Los siguientes datos se almacenan en tu navegador (localStorage). No se envían al servidor y no se sincronizan entre dispositivos.

- Datos de partidas (partidas guardadas, historial de jugadas, etc.)
- Preferencias de juego (modo de espiar, mostrar coordenadas, etc.)
- Configuración de práctica (límites de tiempo, configuración de FEN, etc.)
- Indicadores de omisión de tutoriales
- Configuración del tema (modo oscuro/claro)

### Posible pérdida de datos

Los datos almacenados en el navegador no desaparecerán al cerrar el navegador.
Sin embargo, pueden perderse debido a los siguientes eventos:

- Eliminar el historial del navegador o los datos del sitio mediante acción del usuario.
- Eliminar o reinstalar el navegador.
- Exceder los límites de almacenamiento.
- Actualizaciones o fallos del navegador.
- Cambios en los métodos de almacenamiento de datos por parte del proveedor del servicio.

## Datos almacenados en el servidor

Los siguientes datos se almacenan en el servidor y se gestionan en asociación con tu cuenta de usuario.

- Perfil de usuario (nombre para mostrar, avatar)
- Información de autenticación
- Clasificaciones / rankings
- Funciones sociales (publicaciones en temas, me gusta, seguimientos, valoraciones)
- Registros de moderación

## Eliminación de cuenta

Los usuarios pueden eliminar su cuenta. Cuando se elimina una cuenta, los datos almacenados en el servidor serán eliminados. Los datos almacenados en el navegador no se ven afectados por la eliminación de la cuenta, por lo que deberás eliminarlos manualmente desde tu navegador si es necesario.

## Aviso de uso

Este servicio web almacena datos tanto en el navegador como en el servidor. Ten en cuenta que los datos almacenados en el navegador pueden perderse por las razones descritas anteriormente.`;

export default content;
