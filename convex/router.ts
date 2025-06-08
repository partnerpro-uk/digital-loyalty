import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Create "View As" session endpoint
http.route({
  path: "/api/admin/create-view-as-session",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { accountId, userId } = await req.json();
    
    try {
      const result = await ctx.runMutation(api.admin.startViewAsUserSession, {
        accountId,
        userId,
      });
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// End "View As" session endpoint
http.route({
  path: "/api/admin/end-view-as-session",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { sessionToken } = await req.json();
    
    try {
      const result = await ctx.runMutation(api.admin.endViewAsUserSession, {
        sessionToken,
      });
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
