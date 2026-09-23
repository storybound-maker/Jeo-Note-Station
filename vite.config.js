import {defineConfig,loadEnv}from"vite";
import react from"@vitejs/plugin-react";

async function research(query,env,context){
  const searchResponse=await fetch("https://api.tavily.com/search",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      api_key:env.TAVILY_API_KEY,
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
  if(!results.length)return {answer:"I could not find useful web sources for that question.",sources:[]};
  const sourceText=results.map((r,i)=>`SOURCE ${i+1}
Title: ${r.title||"Untitled"}
URL: ${r.url||""}
Snippet: ${r.content||""}`).join("\n\n");
  const aiResponse=await fetch("https://openrouter.ai/api/v1/chat/completions",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":`Bearer ${env.OPENROUTER_API_KEY}`,
      "HTTP-Referer":env.APP_URL||"http://localhost:5173",
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
  return {answer,sources};
}

export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),"");
  return {
    plugins:[react(),{
      name:"jeo-local-research-api",
      configureServer(server){
        server.middlewares.use("/api/research",async(req,res)=>{
          if(req.method!=="POST"){res.statusCode=405;return res.end(JSON.stringify({error:"Method not allowed"}));}
          if(!env.TAVILY_API_KEY){res.statusCode=500;return res.end(JSON.stringify({error:"TAVILY_API_KEY is not configured. Add it to .env.local."}));}
          if(!env.OPENROUTER_API_KEY){res.statusCode=500;return res.end(JSON.stringify({error:"OPENROUTER_API_KEY is not configured. Add it to .env.local."}));}
          let raw="";
          for await(const chunk of req)raw+=chunk;
          try{
            const body=JSON.parse(raw);
            const query=body.query?.trim();
            const context=body.context||null;
            if(!query){res.statusCode=400;return res.end(JSON.stringify({error:"A research question is required."}));}
            const result=await research(query,env,context);
            res.setHeader("Content-Type","application/json");
            res.end(JSON.stringify(result));
          }catch(error){
            res.statusCode=500;
            res.setHeader("Content-Type","application/json");
            res.end(JSON.stringify({error:error.message||"Research request failed."}));
          }
        });
      }
    }]
  };
});