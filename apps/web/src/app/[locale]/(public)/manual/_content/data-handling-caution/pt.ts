const content = `# Precauções sobre o tratamento de dados

## Dados armazenados no navegador

Os seguintes dados são armazenados no seu navegador (localStorage). Eles não são enviados ao servidor e não são sincronizados entre dispositivos.

- Dados de partidas (partidas salvas, histórico de lances, etc.)
- Preferências de jogo (modo de espiar, mostrar coordenadas, etc.)
- Configuração de prática (limites de tempo, configuração de FEN, etc.)
- Indicadores de pular tutoriais
- Configuração do tema (modo escuro/claro)

### Possível perda de dados

Os dados armazenados no navegador não desaparecem ao fechar o navegador.
No entanto, podem ser perdidos devido aos seguintes eventos:

- Excluir o histórico do navegador ou os dados do site por ação do usuário.
- Excluir ou reinstalar o navegador.
- Exceder os limites de armazenamento.
- Atualizações ou falhas do navegador.
- Mudanças nos métodos de armazenamento de dados por parte do provedor do serviço.

## Dados armazenados no servidor

Os seguintes dados são armazenados no servidor e gerenciados em associação com sua conta de usuário.

- Perfil de usuário (nome de exibição, avatar)
- Informações de autenticação
- Rankings / classificações
- Recursos sociais (publicações em tópicos, curtidas, seguidores, avaliações)
- Registros de moderação

## Exclusão de conta

Os usuários podem excluir sua conta. Quando uma conta é excluída, os dados armazenados no servidor serão eliminados. Os dados armazenados no navegador não são afetados pela exclusão da conta, então você deverá excluí-los manualmente do seu navegador se necessário.

## Aviso de uso

Este serviço web armazena dados tanto no navegador quanto no servidor. Tenha em mente que os dados armazenados no navegador podem ser perdidos pelas razões descritas anteriormente.`;

export default content;
