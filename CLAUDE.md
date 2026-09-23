@AGENTS.md

# Si tocás la estructura, actualizá los flujos

Los recorridos del Shop están documentados con diagramas mermaid en
`D:\Gestion Sendero 3D\Cerebro Sendero 3D\02 - Shop\SHOP - Flujos.md`. Esa nota **es parte
del cambio, no una tarea posterior**: una documentación de flujos que miente es peor que no
tenerla, porque se le cree.

Actualizala cuando el cambio toque cualquiera de estas cosas:

- Se agrega, borra o renombra una **página** (`page.tsx`) o una ruta.
- Se agrega, borra o renombra un **endpoint** (`route.ts`), o cambian sus métodos.
- Cambia **quién navega a dónde**: un `<Link>`, un `router.push`, un `redirect`.
- Cambia un **gate de sesión** (`src/proxy.ts` o un layout) o quién entra a qué.
- Cambia la **máquina de estados del pedido** o qué la mueve (admin, webhook de MP, cron).
- Cambia el **contrato con el inventario** (`src/lib/inventario-webhook.ts`): la firma, la
  idempotencia o quién lo dispara. En ese caso actualizá **también**
  `Cerebro Sendero 3D\Flujos del ecosistema.md`.

Al actualizarla: corregí el diagrama y no solo el texto, poné la fecha en el frontmatter, y
asegurate de que el mermaid parsee — toda etiqueta con `/`, `(`, `)`, `[`, `]`, `:` o coma va
entre comillas (`A["/api/pedidos"]`, nunca `A[/api/pedidos]`).

Si tu cambio deja desactualizada una nota de **otro** sistema (`INV -`, `BOD -`), no la
corrijas: anotá la discrepancia y avisá. Ver `Cerebro Sendero 3D\Convenciones del vault.md`.
