1. users: usar la tabla del Starter Kit

No crearíamos una segunda tabla users.

Tomamos la que Laravel ya trae y la extendemos con las columnas de nuestro sistema que realmente necesitamos, por ejemplo:

company_id
default_branch_id
username
phone
status
must_change_password
last_login_at

Conservamos además las columnas que Laravel necesita, como:

id
name
email
email_verified_at
password
remember_token
created_at
updated_at

Y, si queremos mantener nuestra convención de UUID para entidades importantes, agregamos:

uuid UUID NOT NULL UNIQUE

Por tanto:

users lógico nuestro → se implementa sobre el users de Laravel, no como tabla adicional.

2. sessions: usar la de Laravel

Si el proyecto usa sesiones en base de datos, Laravel ya posee su tabla sessions.

Entonces no necesitamos nuestra propia sessions de negocio.

La sesión de Laravel ya maneja aspectos como usuario, IP, user-agent, payload y actividad. Para revocar/controlar accesos podemos trabajar con la infraestructura de Laravel y complementar con devices cuando necesitemos saber qué dispositivo empresarial está autorizado.

Por tanto:

nuestra tabla lógica sessions → queda absorbida por la tabla técnica de Laravel.

Esto es justamente el tipo de reducción física que ahora sí tiene sentido hacer: no estamos eliminando una necesidad funcional, sino evitando duplicar una función del framework.

3. Roles y permisos: usar spatie/laravel-permission

Aquí tampoco recomiendo mantener nuestras tablas propias:

roles
permissions
role_permissions
user_roles
user_permissions

si vamos a instalar Laravel Permission.

El paquete ya implementa conceptualmente estas mismas relaciones con:

roles
permissions
role_has_permissions
model_has_roles
model_has_permissions

La equivalencia sería:

Nuestro modelo lógico	Implementación con Laravel Permission
roles	roles
permissions	permissions
role_permissions	role_has_permissions
user_roles	model_has_roles
user_permissions	model_has_permissions

Por tanto no debemos crear nuestras cinco tablas RBAC propias.

Eso además nos da inmediatamente integración Laravel como:

$user->assignRole('SELLER');

$user->givePermissionTo('sales.create');

$user->can('inventory.adjust.confirm');

y middleware/policies sobre esa misma infraestructura.

4. user_permissions con ALLOW/DENY

Aquí hay una diferencia que tenemos que decidir conscientemente.

Nuestro diseño original establecía una precedencia:

DENY individual
>
ALLOW individual
>
roles
>
default deny

Laravel Permission maneja muy bien permisos otorgados directamente y permisos por rol, pero nuestra semántica explícita de DENY individual no es el patrón normal del paquete.

Mi recomendación para V1 es simplificar:

permisos por rol
+
permisos directos adicionales
+
Policies/Gates para restricciones contextuales

y no crear un sistema paralelo de DENY salvo que realmente tengamos un caso empresarial que lo necesite.

Ejemplo:

SELLER
→ sales.create
→ payments.create

Si un vendedor concreto no debe registrar pagos, lo más limpio normalmente sería darle otro rol/configuración apropiada, en lugar de empezar a construir una segunda capa de permisos negativos.

Eso nos evita complejidad innecesaria.

5. user_branches: esta sí debe quedarse

Laravel Permission no reemplaza nuestra necesidad de saber a qué sucursales puede acceder un usuario.

Por tanto mantenemos:

user_branches

Por ejemplo:

user_id
branch_id
is_default
status
assigned_by
assigned_at

Esta tabla responde:

¿A qué sucursales puede entrar este usuario?

Mientras Spatie responde:

¿Qué puede hacer este usuario?

Son conceptos diferentes.

Así podemos tener:

Usuario Carlos
Rol: SELLER

Sucursales:
✓ Mazuko
✓ Huepetuhe
✗ Juliaca

El backend deberá cumplir ambas cosas:

permission
+
branch scope

Para crear una venta en Mazuko:

$user->can('sales.create')

y además:

user_branches contiene Mazuko
6. No usaría inicialmente “Teams” de Spatie para representar sucursales

El paquete puede manejar escenarios de permisos por equipos, pero para nuestro sistema considero más limpio mantener:

Spatie → autorización funcional
user_branches → alcance territorial

porque ya tenemos una separación clara.

Además tendremos usuarios como el administrador general que puede tener:

role = ADMIN

y acceso a muchas o todas las sucursales.

Meter branch_id dentro del motor de roles desde el principio haría más complejo algo que ya resolvemos elegantemente con user_branches.

Si más adelante surge el requisito:

“Carlos es WAREHOUSE en Mazuko, pero SELLER en Huepetuhe”

entonces sí revisamos si conviene activar permisos/roles por equipo/sucursal.

Para V1 no lo complicaría.

7. devices y device_users: estas dos sí se conservan

Laravel no cubre nuestra necesidad empresarial de dispositivos PWA autorizados.

Necesitamos seguir teniendo:

devices
device_users

porque representan cosas como:

PC Caja Mazuko 01
AUTHORIZED

Usuario A → autorizado
Usuario B → autorizado

y almacenan además:

last_seen_at
last_synced_at
last_pull_sequence
last_push_at
last_pull_at
app_version

Eso pertenece a nuestro dominio PWA, no a Laravel Auth.

8. companies y branches: se mantienen

Por supuesto:

companies
branches

son tablas propias del negocio.

Laravel no las reemplaza.

Entonces nuestro Bloque 1 cambia físicamente

Originalmente teníamos 12 tablas conceptuales:

companies
branches
users
roles
permissions
role_permissions
user_roles
user_permissions
user_branches
sessions
devices
device_users

La implementación quedaría conceptualmente así:

PROPIAS / EXTENDIDAS

companies
branches
users                ← tabla Laravel extendida
user_branches
devices
device_users

Laravel:

sessions              ← tabla estándar Laravel
password_reset_tokens ← técnica Laravel, fuera del dominio

Laravel Permission:

roles
permissions
role_has_permissions
model_has_roles
model_has_permissions

Por tanto ya no vamos a crear físicamente:

role_permissions
user_roles
user_permissions

porque su función queda reemplazada por las tablas de Spatie.

Y tampoco creamos una segunda:

sessions
Esto cambia una distinción importante

Hasta ahora hablábamos de:

87 tablas de dominio/lógicas

Eso sigue siendo válido como documentación conceptual.

Pero a partir de este momento necesitamos dejar de decir:

“vamos a crear exactamente esas 87 migraciones”.

Porque ahora ya estamos tomando una decisión de implementación mucho mejor:

El modelo lógico define las responsabilidades; el modelo físico Laravel reutiliza tablas del framework y paquetes donde esas responsabilidades ya están implementadas.

Por ejemplo:

Responsabilidad lógica:
USER_ROLE

se conserva.

Implementación física:

model_has_roles

en vez de:

user_roles

Eso no pierde funcionalidad.

Mi propuesta para continuar

Antes de generar migraciones, haría ahora una etapa específica:

Etapa 4.4 — Adaptación del modelo físico a Laravel

Y recorreríamos las 87 tablas, pero clasificándolas en solo tres categorías:

Categoría	Qué haremos
A. Laravel/framework	reutilizar tabla existente y extenderla cuando corresponda
B. Paquete externo	utilizar su estructura oficial, por ejemplo Laravel Permission
C. Dominio propio	crear exactamente nuestras migraciones

Empezaría por Bloque 1 completo, porque aquí están casi todas las colisiones con Laravel.

El resultado esperado sería algo aproximadamente así:

companies                 → NUEVA
branches                  → NUEVA

users                     → EXTENDER Laravel users

roles                     → SPATIE
permissions               → SPATIE
role_permissions          → reemplazada por role_has_permissions
user_roles                → reemplazada por model_has_roles
user_permissions          → reemplazada por model_has_permissions

user_branches             → NUEVA

sessions                  → LARAVEL

devices                   → NUEVA
device_users              → NUEVA

Y después revisaríamos el resto de las tablas. En los otros 75 elementos habrá muchas menos colisiones, porque inventario, ventas, Kardex, transferencias, caja, PWA e importación son verdaderamente dominio propio.

Este ajuste debemos hacerlo ahora, antes de generar una sola migración definitiva. De esa manera no terminamos manteniendo dos sistemas de autenticación, dos sistemas de sesiones y dos sistemas de roles/permisos.
