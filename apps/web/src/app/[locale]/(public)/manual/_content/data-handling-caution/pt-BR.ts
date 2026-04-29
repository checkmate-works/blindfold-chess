const content = `# Cuidados com o tratamento de dados

## Dados armazenados no navegador

Os seguintes dados são armazenados no seu navegador (localStorage). Eles não são enviados ao servidor e não são sincronizados entre dispositivos.

- Dados de partida (partidas salvas, histórico de lances etc.)
- Preferências de jogo (modo espiar, exibir coordenadas etc.)
- Configurações de prática (limites de tempo, configurações de FEN etc.)
- Indicadores de dispensa de tutoriais
- Configurações de tema (modo escuro/claro)

### Possível perda de dados

Os dados armazenados no navegador não desaparecem ao fechar o navegador.
No entanto, eles podem ser perdidos pelos seguintes motivos:

- Exclusão do histórico do navegador ou dos dados do site por ação do usuário.
- Exclusão ou reinstalação do navegador.
- Excesso dos limites de armazenamento.
- Atualizações ou falhas do navegador.
- Mudanças no método de armazenamento de dados pelo provedor do serviço.

## Dados armazenados no servidor

Os seguintes dados são armazenados no servidor e gerenciados de forma associada à sua conta de usuário.

- Perfil de usuário (nome de exibição, avatar)
- Informações de autenticação
- Classificações / rankings
- Funcionalidades sociais (postagens em tópicos, curtidas, seguidores, avaliações)
- Registros de moderação

## Exclusão de conta

Os usuários podem excluir suas contas. Quando uma conta é excluída, os dados armazenados no servidor são removidos. Os dados armazenados no navegador não são afetados pela exclusão da conta, então, se necessário, exclua-os manualmente pelo seu navegador.

## Aviso de uso

Este serviço web armazena dados tanto no navegador quanto no servidor. Esteja ciente de que os dados armazenados no navegador podem ser perdidos pelos motivos descritos acima.`;

export default content;
