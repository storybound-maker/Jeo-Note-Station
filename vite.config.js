import {defineConfig,loadEnv}from"vite";
import react from"@vitejs/plugin-react";

async function research(query,key){
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-goog-api-key":key},
    body:JSON.stringify({
      contents:[{parts:[{text:"Research the user's question using Google Search. Give a concise, useful answer with important facts, dates when relevant, and clearly distinguish uncertainty. Question: "+query}]}],
      tools:[{google_search:{}}]
    })
  });
  const data=await response.json();
  if(!response.ok)throw new Error(data.error?.message||"Gemini research request failed.");
  const answer=data.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim()||"No answer was returned.";
  const sources=[];
  for(const chunk of data.candidates?.[0]?.groundingMetadata?.groundingChunks||[]){
    const url=chunk.web?.uri;
    const title=chunk.web?.title;
    if(url&&!sources.some(s=>s.url===url))sources.push({url,title:title||url});
  }
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
          if(!env.GEMINI_API_KEY){res.statusCode=500;return res.end(JSON.stringify({error:"GEMINI_API_KEY is not configured. Add it to .env.local."}));}
          let raw="";
          for await(const chunk of req)raw+=chunk;
          try{
            const query=JSON.parse(raw).query?.trim();
            if(!query){res.statusCode=400;return res.end(JSON.stringify({error:"A research question is required."}));}
            const result=await research(query,env.GEMINI_API_KEY);
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