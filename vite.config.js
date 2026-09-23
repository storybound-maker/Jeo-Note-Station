import {defineConfig,loadEnv} from "vite";
import react from "@vitejs/plugin-react";

async function research(query,key){
  const response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
    body:JSON.stringify({
      model:"gpt-5.6-luna",
      tools:[{type:"web_search"}],
      input:`Research the user's question using the web. Give a concise, useful answer with important facts and clearly distinguish uncertainty. Question: ${query}`
    })
  });
  const data=await response.json();
  if(!response.ok)throw new Error(data.error?.message||"OpenAI research request failed.");
  const sources=[];
  for(const item of data.output||[])for(const part of item.content||[])for(const annotation of part.annotations||[]){
    const url=annotation.url||annotation.source?.url;
    if(url&&!sources.some(s=>s.url===url))sources.push({url,title:annotation.title||url});
  }
  return {answer:data.output_text||"No answer was returned.",sources};
}

export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),"");
  return {
    plugins:[react(),{
      name:"jeo-local-research-api",
      configureServer(server){
        server.middlewares.use("/api/research",async(req,res)=>{
          if(req.method!=="POST"){res.statusCode=405;return res.end(JSON.stringify({error:"Method not allowed"}));}
          if(!env.OPENAI_API_KEY){res.statusCode=500;return res.end(JSON.stringify({error:"OPENAI_API_KEY is not configured. Add it to .env.local."}));}
          let raw="";
          for await(const chunk of req)raw+=chunk;
          try{
            const query=JSON.parse(raw).query?.trim();
            if(!query){res.statusCode=400;return res.end(JSON.stringify({error:"A research question is required."}));}
            const result=await research(query,env.OPENAI_API_KEY);
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
