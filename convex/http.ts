import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Content-Type": "application/json" };
http.route({ pathPrefix: "/extension/", method: "OPTIONS", handler: httpAction(async () => new Response(null,{status:204,headers:cors})) });
http.route({ path: "/extension/profile", method: "GET", handler: httpAction(async (ctx,request) => {
  const url=new URL(request.url);const authorization=request.headers.get("Authorization")??"";const token=authorization.replace(/^Bearer\s+/i,"");const platform=url.searchParams.get("platform");const handle=url.searchParams.get("handle")??"";
  if(platform!=="instagram"&&platform!=="youtube")return new Response(JSON.stringify({error:"Invalid platform."}),{status:400,headers:cors});
  const result=await ctx.runQuery(api.extensionApi.profile,{token,platform,handle});return new Response(JSON.stringify(result),{headers:cors});
})});
http.route({ path: "/extension/unlock", method: "POST", handler: httpAction(async (ctx,request) => {
  const authorization=request.headers.get("Authorization")??"";const token=authorization.replace(/^Bearer\s+/i,"");const body=await request.json() as {creatorId:string};
  try { const result=await ctx.runMutation(api.extensionApi.unlock,{token,creatorId:body.creatorId as never});return new Response(JSON.stringify(result),{headers:cors}); } catch(error) { return new Response(JSON.stringify({error:error instanceof Error?error.message:"Unlock failed."}),{status:400,headers:cors}); }
})});

export default http;
