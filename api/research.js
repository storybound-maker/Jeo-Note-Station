export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  if(!process.env.GEMINI_API_KEY)return res.status(500).json({error:"GEMINI_API_KEY is not configured on the server."});
  const query=typeof req.body?.query==="string"?req.body.query.trim():"";
  if(!query)return res.status(400).json({error:"A research question is required."});
  try{
    const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},
      body:JSON.stringify({
        contents:[{parts:[{text:"Research the user's question using Google Search. Give a concise, useful answer with important facts, dates when relevant, and clearly distinguish uncertainty. Question: "+query}]}],
        tools:[{google_search:{}}]
      })
    });
    const data=await response.json();
    if(!response.ok)return res.status(response.status).json({error:data.error?.message||"Gemini research request failed."});
    const answer=data.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim()||"No answer was returned.";
    const sources=[];
    for(const chunk of data.candidates?.[0]?.groundingMetadata?.groundingChunks||[]){
      const url=chunk.web?.uri;
      const title=chunk.web?.title;
      if(url&&!sources.some(s=>s.url===url))sources.push({url,title:title||url});
    }
    return res.status(200).json({answer,sources});
  }catch(error){
    return res.status(500).json({error:error.message||"Research request failed."});
  }
}