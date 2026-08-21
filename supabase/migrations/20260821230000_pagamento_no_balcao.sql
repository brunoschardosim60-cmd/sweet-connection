alter table public.pedidos_cardapio drop constraint if exists pedidos_cardapio_pagamento_check;
alter table public.pedidos_cardapio add constraint pedidos_cardapio_pagamento_check check (pagamento in ('pix','cartao','dinheiro','balcao'));
