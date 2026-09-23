export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:"OPENAI_API_KEY is not configured on the server."});
  const query=typeof req.body?.query==="string"?req.body.query.trim():"";
  if(!query)return res.status(400).json({error:"A research question is required."});
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},
      body:JSON.stringify({
        model:"gpt-5.6-luna",
        tools:[{type:"web_search"}],
        input:`Research the user's question using the web. Give a concise, useful answer with important facts and clearly distinguish uncertainty. Question: ${query}`
      })
    });
    const data=await response.json();
    if(!response.ok)return res.status(response.status).json({error:data.error?.message||"OpenAI research request failed."});
    const answer=data.output_text||"No answer was returned.";
    const sources=[];
    for(const item of data.output||[]){
      for(const part of item.content||[]){
        for(const annotation of part.annotations||[]){
          const url=annotation.url||annotation.source?.url;
          if(url&&!sources.some(s=>s.url===url))sources.push({url,title:annotation.title||url});
        }
      }
    }
    return res.status(200).json({answer,sources});
  }catch(error){
    return res.status(500).json({error:error.message||"Research request failed."});
  }
}
