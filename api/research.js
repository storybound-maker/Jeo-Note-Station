export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  if(!process.env.TAVILY_API_KEY)return res.status(500).json({error:"TAVILY_API_KEY is not configured on the server."});
  if(!process.env.OPENROUTER_API_KEY)return res.status(500).json({error:"OPENROUTER_API_KEY is not configured on the server."});
  const query=typeof req.body?.query==="string"?req.body.query.trim():"";
  const context=req.body?.context&&typeof req.body.context==="object"?req.body.context:null;
  if(!query)return res.status(400).json({error:"A research question is required."});
  try{
    const searchResponse=await fetch("https://api.tavily.com/search",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        api_key:process.env.TAVILY_API_KEY,
        query:context?.originalQuestion?`${context.originalQuestion} ${query}`:query,
        search_depth:"basic",
        max_results:6,
        include_answer:false,
        include_raw_content:false
      })
    });
    const searchData=await searchResponse.json();
    if(!searchResponse.ok)throw new Error(searchData.detail||searchData.error||"Web search failed.");
    const results=Array.isArray(searchData.results)?searchData.results:[];
    if(!results.length)return res.status(200).json({answer:"I could not find useful web sources for that question.",sources:[]});
    const sourceText=results.map((r,i)=>`SOURCE ${i+1}
Title: ${r.title||"Untitled"}
URL: ${r.url||""}
Snippet: ${r.content||""}`).join("\n\n");
    const aiResponse=await fetch("https://openrouter.ai/api/v1/chat/completions",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer":process.env.APP_URL||"https://jeo-note-station.vercel.app",
        "X-Title":"JEO Note Station"
      },
      body:JSON.stringify({
        model:"openrouter/free",
        messages:[
          {role:"system",content:"You are JEO Note Station's research assistant. Answer using only the supplied web sources. Be concise but useful. Include important facts and dates when relevant. Do not invent facts or citations. When sources disagree or evidence is incomplete, say so. Use plain text with short paragraphs and bullets when helpful."},
          {role:"user",content:`Research question: ${query}${context?.originalQuestion?`\n\nThis is a follow-up to: ${context.originalQuestion}\nPrevious answer: ${context.previousAnswer||""}`:""}\n\nWeb sources:\n${sourceText}`}
        ],
        max_tokens:900
      })
    });
    const aiData=await aiResponse.json();
    if(!aiResponse.ok)throw new Error(aiData.error?.message||"AI synthesis failed.");
    const answer=aiData.choices?.[0]?.message?.content?.trim()||"No answer was returned.";
    const sources=results.map(r=>({url:r.url,title:r.title||r.url})).filter((s,i,a)=>s.url&&!a.some((x,j)=>j<i&&x.url===s.url));
    return res.status(200).json({answer,sources});
  }catch(error){
    return res.status(500).json({error:error.message||"Research request failed."});
  }
}