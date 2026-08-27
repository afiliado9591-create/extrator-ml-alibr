export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const url = req.method === 'GET' ? req.query.url : req.body?.url;
  if (!isAllowedUrl(url)) return res.status(400).json({ error: 'Informe uma URL válida do Mercado Livre' });
  try {
    const response = await fetch(url, { redirect: 'follow', headers: browserHeaders() });
    if (!response.ok) return res.status(200).json({ originalUrl:url, error:`Não foi possível acessar o link (status ${response.status})` });
    const html = await response.text();
    let image = meta(html, 'property', 'og:image') || '';
    if (image) image = image.replace(/-[A-Z]\.(jpg|jpeg|png|webp)/i, '-F.$1');
    return res.status(200).json({
      originalUrl:url, finalUrl:response.url,
      title:clean(meta(html,'property','og:title') || tag(html,'title')),
      description:clean(meta(html,'property','og:description') || meta(html,'name','description')),
      image,
      price:meta(html,'property','product:price:amount') || null
    });
  } catch (err) { return res.status(200).json({ originalUrl:url, error:err.message }); }
}
function cors(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
function browserHeaders(){return {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36','Accept-Language':'pt-BR,pt;q=0.9','Accept':'text/html,application/xhtml+xml'};}
function isAllowedUrl(value){try{const u=new URL(value);return u.protocol==='https:' && (/(^|\.)mercadolivre\.com\.br$/i.test(u.hostname) || u.hostname.toLowerCase()==='meli.la');}catch{return false;}}
function meta(html,key,value){const esc=value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');for(const re of [new RegExp(`<meta[^>]+${key}=["']${esc}["'][^>]+content=["']([^"']+)["']`,'i'),new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${key}=["']${esc}["']`,'i')]){const m=html.match(re);if(m)return m[1];}return '';}
function tag(html,name){return html.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`,'i'))?.[1] || '';}
function clean(t=''){return t.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();}
