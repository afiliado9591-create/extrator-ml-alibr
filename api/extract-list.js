export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const url = req.method === 'GET' ? req.query.url : req.body?.url;
  if (!isAllowedUrl(url)) return res.status(400).json({ error:'Informe uma URL válida do Mercado Livre', products:[] });
  try {
    const response = await fetch(url,{redirect:'follow',headers:browserHeaders()});
    if(!response.ok) return res.status(200).json({originalUrl:url,error:`Não foi possível acessar o link (status ${response.status})`,products:[]});
    const html=await response.text(); const products=extractProducts(html);
    return res.status(200).json({originalUrl:url,finalUrl:response.url,total:products.length,products});
  } catch(err){return res.status(200).json({originalUrl:url,error:err.message,products:[]});}
}
function extractProducts(html){
  let blocks=split(html,/<div class="poly-card[^"]*"/g); if(!blocks.length) blocks=split(html,/<li class="ui-search-layout__item[^"]*"/g);
  const out=[],seen=new Set();
  for(const b of blocks){
    const title=first(b,/class="poly-component__title"[^>]*>([^<]+)</)||first(b,/class="ui-search-item__title"[^>]*>([^<]+)</);
    let link=first(b,/class="poly-component__title"[^>]*href="([^"]+)"/)||first(b,/href="([^"]+)"[^>]*class="poly-component__title"/)||first(b,/class="ui-search-link"[^>]*href="([^"]+)"/)||first(b,/<a[^>]*href="(https:\/\/[^\"]*mercadolivre\.com\.br[^\"]*)"/);
    const fraction=first(b,/class="andes-money-amount__fraction"[^>]*>([\d.,]+)</), cents=first(b,/class="andes-money-amount__cents"[^>]*>(\d+)</);
    if(!title||!link) continue; link=decode(link); const key=link.split('#')[0]; if(seen.has(key))continue; seen.add(key);
    let price=fraction?fraction.replace(/\./g,'').replace(',',''):''; if(price&&cents)price+='.'+cents;
    let image=extractImage(b); if(image)image=decode(image).replace(/-[A-Z]\.(jpg|jpeg|png|webp)/i,'-F.$1');
    out.push({nome:clean(title),preco:price,linkProduto:link.startsWith('http')?link:`https://www.mercadolivre.com.br${link}`,linkImagem:image||''});
  } return out;
}
function split(html,re){const marks=[];let m;while((m=re.exec(html))!==null)marks.push(m.index);return marks.map((x,i)=>html.slice(x,marks[i+1]??Math.min(x+9000,html.length)));}
function extractImage(b){const m=b.match(/https:\/\/[^"'\s)]+\.mlstatic\.com\/[^"'\s)]+/g);if(!m)return '';return (m.find(u=>/D_(NQ|Q)_(NP_)?\d/.test(u))||m[0]).split(',')[0].trim();}
function first(s,re){return s.match(re)?.[1]||'';} function decode(s){return s.replace(/&amp;/g,'&');}
function clean(s=''){return decode(s).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();}
function cors(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
function browserHeaders(){return {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36','Accept-Language':'pt-BR,pt;q=0.9','Accept':'text/html,application/xhtml+xml'};}
function isAllowedUrl(value){try{const u=new URL(value);return u.protocol==='https:' && (/(^|\.)mercadolivre\.com\.br$/i.test(u.hostname) || u.hostname.toLowerCase()==='meli.la');}catch{return false;}}
