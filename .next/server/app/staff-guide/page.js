(()=>{var a={};a.id=746,a.ids=[746],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},16953:(a,b,c)=>{"use strict";c.r(b),c.d(b,{default:()=>f,metadata:()=>e});var d=c(75338);c(82704);let e={title:"MyCBCT by 360 Visualise",description:"CBCT scan referrals, scans and reports for referring dentists. By 360 Visualise."};function f({children:a}){return(0,d.jsx)("html",{lang:"en-GB",children:(0,d.jsx)("body",{children:a})})}},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},26713:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/is-bot")},28354:a=>{"use strict";a.exports=require("util")},28736:(a,b,c)=>{Promise.resolve().then(c.t.bind(c,81170,23)),Promise.resolve().then(c.t.bind(c,23597,23)),Promise.resolve().then(c.t.bind(c,36893,23)),Promise.resolve().then(c.t.bind(c,89748,23)),Promise.resolve().then(c.t.bind(c,6060,23)),Promise.resolve().then(c.t.bind(c,7184,23)),Promise.resolve().then(c.t.bind(c,69576,23)),Promise.resolve().then(c.t.bind(c,73041,23)),Promise.resolve().then(c.t.bind(c,51384,23))},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:a=>{"use strict";a.exports=require("path")},41025:a=>{"use strict";a.exports=require("next/dist/server/app-render/dynamic-access-async-storage.external.js")},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},63734:()=>{},66935:(a,b,c)=>{"use strict";c.r(b),c.d(b,{GlobalError:()=>E.a,__next_app__:()=>K,handler:()=>M,pages:()=>J,routeModule:()=>L,tree:()=>I});var d=c(49754),e=c(9117),f=c(46595),g=c(32324),h=c(39326),i=c(38928),j=c(20175),k=c(12),l=c(54290),m=c(12696),n=c(52574),o=c(82802),p=c(77533),q=c(45229),r=c(32822),s=c(261),t=c(26453),u=c(52474),v=c(26713),w=c(51356),x=c(62685),y=c(36225),z=c(63446),A=c(2762),B=c(45742),C=c(86439),D=c(81170),E=c.n(D),F=c(62506),G=c(91203),H={};for(let a in F)0>["default","tree","pages","GlobalError","__next_app__","routeModule","handler"].indexOf(a)&&(H[a]=()=>F[a]);c.d(b,H);let I={children:["",{children:["staff-guide",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(c.bind(c,88800)),"/Users/workmac/Documents/doors-session2-work/mycbct-portal/app/staff-guide/page.jsx"]}]},{}]},{layout:[()=>Promise.resolve().then(c.bind(c,16953)),"/Users/workmac/Documents/doors-session2-work/mycbct-portal/app/layout.tsx"],"global-error":[()=>Promise.resolve().then(c.t.bind(c,81170,23)),"next/dist/client/components/builtin/global-error.js"],"not-found":[()=>Promise.resolve().then(c.t.bind(c,87028,23)),"next/dist/client/components/builtin/not-found.js"],forbidden:[()=>Promise.resolve().then(c.t.bind(c,90461,23)),"next/dist/client/components/builtin/forbidden.js"],unauthorized:[()=>Promise.resolve().then(c.t.bind(c,32768,23)),"next/dist/client/components/builtin/unauthorized.js"]}]}.children,J=["/Users/workmac/Documents/doors-session2-work/mycbct-portal/app/staff-guide/page.jsx"],K={require:c,loadChunk:()=>Promise.resolve()},L=new d.AppPageRouteModule({definition:{kind:e.RouteKind.APP_PAGE,page:"/staff-guide/page",pathname:"/staff-guide",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:I},distDir:".next",relativeProjectDir:""});async function M(a,b,d){var D;let H="/staff-guide/page";"/index"===H&&(H="/");let N=(0,h.getRequestMeta)(a,"postponed"),O=(0,h.getRequestMeta)(a,"minimalMode"),P=await L.prepare(a,b,{srcPage:H,multiZoneDraftMode:!1});if(!P)return b.statusCode=400,b.end("Bad Request"),null==d.waitUntil||d.waitUntil.call(d,Promise.resolve()),null;let{buildId:Q,query:R,params:S,parsedUrl:T,pageIsDynamic:U,buildManifest:V,nextFontManifest:W,reactLoadableManifest:X,serverActionsManifest:Y,clientReferenceManifest:Z,subresourceIntegrityManifest:$,prerenderManifest:_,isDraftMode:aa,resolvedPathname:ab,revalidateOnlyGenerated:ac,routerServerContext:ad,nextConfig:ae,interceptionRoutePatterns:af}=P,ag=T.pathname||"/",ah=(0,s.normalizeAppPath)(H),{isOnDemandRevalidate:ai}=P,aj=L.match(ag,_),ak=!!_.routes[ab],al=!!(aj||ak||_.routes[ah]),am=a.headers["user-agent"]||"",an=(0,v.getBotType)(am),ao=(0,q.isHtmlBotRequest)(a),ap=(0,h.getRequestMeta)(a,"isPrefetchRSCRequest")??"1"===a.headers[u.NEXT_ROUTER_PREFETCH_HEADER],aq=(0,h.getRequestMeta)(a,"isRSCRequest")??(0,n.f)(a.headers[u.RSC_HEADER]),ar=(0,t.getIsPossibleServerAction)(a),as=(0,m.checkIsAppPPREnabled)(ae.experimental.ppr)&&(null==(D=_.routes[ah]??_.dynamicRoutes[ah])?void 0:D.renderingMode)==="PARTIALLY_STATIC",at=!1,au=!1,av=as?N:void 0,aw=as&&aq&&!ap,ax=(0,h.getRequestMeta)(a,"segmentPrefetchRSCRequest"),ay=!am||(0,q.shouldServeStreamingMetadata)(am,ae.htmlLimitedBots);ao&&as&&(al=!1,ay=!1);let az=!0===L.isDev||!al||"string"==typeof N||aw,aA=ao&&as,aB=null;aa||!al||az||ar||av||aw||(aB=ab);let aC=aB;!aC&&L.isDev&&(aC=ab),L.isDev||aa||!al||!aq||aw||(0,k.d)(a.headers);let aD={...F,tree:I,pages:J,GlobalError:E(),handler:M,routeModule:L,__next_app__:K};Y&&Z&&(0,p.setReferenceManifestsSingleton)({page:H,clientReferenceManifest:Z,serverActionsManifest:Y,serverModuleMap:(0,r.createServerModuleMap)({serverActionsManifest:Y})});let aE=a.method||"GET",aF=(0,g.getTracer)(),aG=aF.getActiveScopeSpan();try{let f=L.getVaryHeader(ab,af);b.setHeader("Vary",f);let k=async(c,d)=>{let e=new l.NodeNextRequest(a),f=new l.NodeNextResponse(b);return L.render(e,f,d).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=aF.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==i.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${aE} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${aE} ${a.url}`)})},m=async({span:e,postponed:f,fallbackRouteParams:g})=>{let i={query:R,params:S,page:ah,sharedContext:{buildId:Q},serverComponentsHmrCache:(0,h.getRequestMeta)(a,"serverComponentsHmrCache"),fallbackRouteParams:g,renderOpts:{App:()=>null,Document:()=>null,pageConfig:{},ComponentMod:aD,Component:(0,j.T)(aD),params:S,routeModule:L,page:H,postponed:f,shouldWaitOnAllReady:aA,serveStreamingMetadata:ay,supportsDynamicResponse:"string"==typeof f||az,buildManifest:V,nextFontManifest:W,reactLoadableManifest:X,subresourceIntegrityManifest:$,serverActionsManifest:Y,clientReferenceManifest:Z,setIsrStatus:null==ad?void 0:ad.setIsrStatus,dir:c(33873).join(process.cwd(),L.relativeProjectDir),isDraftMode:aa,isRevalidate:al&&!f&&!aw,botType:an,isOnDemandRevalidate:ai,isPossibleServerAction:ar,assetPrefix:ae.assetPrefix,nextConfigOutput:ae.output,crossOrigin:ae.crossOrigin,trailingSlash:ae.trailingSlash,previewProps:_.preview,deploymentId:ae.deploymentId,enableTainting:ae.experimental.taint,htmlLimitedBots:ae.htmlLimitedBots,devtoolSegmentExplorer:ae.experimental.devtoolSegmentExplorer,reactMaxHeadersLength:ae.reactMaxHeadersLength,multiZoneDraftMode:!1,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:ae.experimental.cacheLife,basePath:ae.basePath,serverActions:ae.experimental.serverActions,...at?{nextExport:!0,supportsDynamicResponse:!1,isStaticGeneration:!0,isRevalidate:!0,isDebugDynamicAccesses:at}:{},experimental:{isRoutePPREnabled:as,expireTime:ae.expireTime,staleTimes:ae.experimental.staleTimes,cacheComponents:!!ae.experimental.cacheComponents,clientSegmentCache:!!ae.experimental.clientSegmentCache,clientParamParsing:!!ae.experimental.clientParamParsing,dynamicOnHover:!!ae.experimental.dynamicOnHover,inlineCss:!!ae.experimental.inlineCss,authInterrupts:!!ae.experimental.authInterrupts,clientTraceMetadata:ae.experimental.clientTraceMetadata||[]},waitUntil:d.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:()=>{},onInstrumentationRequestError:(b,c,d)=>L.onRequestError(a,b,d,ad),err:(0,h.getRequestMeta)(a,"invokeError"),dev:L.isDev}},l=await k(e,i),{metadata:m}=l,{cacheControl:n,headers:o={},fetchTags:p}=m;if(p&&(o[z.NEXT_CACHE_TAGS_HEADER]=p),a.fetchMetrics=m.fetchMetrics,al&&(null==n?void 0:n.revalidate)===0&&!L.isDev&&!as){let a=m.staticBailoutInfo,b=Object.defineProperty(Error(`Page changed from static to dynamic at runtime ${ab}${(null==a?void 0:a.description)?`, reason: ${a.description}`:""}
see more here https://nextjs.org/docs/messages/app-static-to-dynamic-error`),"__NEXT_ERROR_CODE",{value:"E132",enumerable:!1,configurable:!0});if(null==a?void 0:a.stack){let c=a.stack;b.stack=b.message+c.substring(c.indexOf("\n"))}throw b}return{value:{kind:w.CachedRouteKind.APP_PAGE,html:l,headers:o,rscData:m.flightData,postponed:m.postponed,status:m.statusCode,segmentData:m.segmentData},cacheControl:n}},n=async({hasResolved:c,previousCacheEntry:f,isRevalidating:g,span:i})=>{let j,k=!1===L.isDev,l=c||b.writableEnded;if(ai&&ac&&!f&&!O)return(null==ad?void 0:ad.render404)?await ad.render404(a,b):(b.statusCode=404,b.end("This page could not be found")),null;if(aj&&(j=(0,x.parseFallbackField)(aj.fallback)),j===x.FallbackMode.PRERENDER&&(0,v.isBot)(am)&&(!as||ao)&&(j=x.FallbackMode.BLOCKING_STATIC_RENDER),(null==f?void 0:f.isStale)===-1&&(ai=!0),ai&&(j!==x.FallbackMode.NOT_FOUND||f)&&(j=x.FallbackMode.BLOCKING_STATIC_RENDER),!O&&j!==x.FallbackMode.BLOCKING_STATIC_RENDER&&aC&&!l&&!aa&&U&&(k||!ak)){let b;if((k||aj)&&j===x.FallbackMode.NOT_FOUND)throw new C.NoFallbackError;if(as&&!aq){let c="string"==typeof(null==aj?void 0:aj.fallback)?aj.fallback:k?ah:null;if(b=await L.handleResponse({cacheKey:c,req:a,nextConfig:ae,routeKind:e.RouteKind.APP_PAGE,isFallback:!0,prerenderManifest:_,isRoutePPREnabled:as,responseGenerator:async()=>m({span:i,postponed:void 0,fallbackRouteParams:k||au?(0,o.u)(ah):null}),waitUntil:d.waitUntil}),null===b)return null;if(b)return delete b.cacheControl,b}}let n=ai||g||!av?void 0:av;if(at&&void 0!==n)return{cacheControl:{revalidate:1,expire:void 0},value:{kind:w.CachedRouteKind.PAGES,html:y.default.EMPTY,pageData:{},headers:void 0,status:void 0}};let p=U&&as&&((0,h.getRequestMeta)(a,"renderFallbackShell")||au)?(0,o.u)(ag):null;return m({span:i,postponed:n,fallbackRouteParams:p})},p=async c=>{var f,g,i,j,k;let l,o=await L.handleResponse({cacheKey:aB,responseGenerator:a=>n({span:c,...a}),routeKind:e.RouteKind.APP_PAGE,isOnDemandRevalidate:ai,isRoutePPREnabled:as,req:a,nextConfig:ae,prerenderManifest:_,waitUntil:d.waitUntil});if(aa&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate"),L.isDev&&b.setHeader("Cache-Control","no-store, must-revalidate"),!o){if(aB)throw Object.defineProperty(Error("invariant: cache entry required but not generated"),"__NEXT_ERROR_CODE",{value:"E62",enumerable:!1,configurable:!0});return null}if((null==(f=o.value)?void 0:f.kind)!==w.CachedRouteKind.APP_PAGE)throw Object.defineProperty(Error(`Invariant app-page handler received invalid cache entry ${null==(i=o.value)?void 0:i.kind}`),"__NEXT_ERROR_CODE",{value:"E707",enumerable:!1,configurable:!0});let p="string"==typeof o.value.postponed;al&&!aw&&(!p||ap)&&(O||b.setHeader("x-nextjs-cache",ai?"REVALIDATED":o.isMiss?"MISS":o.isStale?"STALE":"HIT"),b.setHeader(u.NEXT_IS_PRERENDER_HEADER,"1"));let{value:q}=o;if(av)l={revalidate:0,expire:void 0};else if(O&&aq&&!ap&&as)l={revalidate:0,expire:void 0};else if(!L.isDev)if(aa)l={revalidate:0,expire:void 0};else if(al){if(o.cacheControl)if("number"==typeof o.cacheControl.revalidate){if(o.cacheControl.revalidate<1)throw Object.defineProperty(Error(`Invalid revalidate configuration provided: ${o.cacheControl.revalidate} < 1`),"__NEXT_ERROR_CODE",{value:"E22",enumerable:!1,configurable:!0});l={revalidate:o.cacheControl.revalidate,expire:(null==(j=o.cacheControl)?void 0:j.expire)??ae.expireTime}}else l={revalidate:z.CACHE_ONE_YEAR,expire:void 0}}else b.getHeader("Cache-Control")||(l={revalidate:0,expire:void 0});if(o.cacheControl=l,"string"==typeof ax&&(null==q?void 0:q.kind)===w.CachedRouteKind.APP_PAGE&&q.segmentData){b.setHeader(u.NEXT_DID_POSTPONE_HEADER,"2");let c=null==(k=q.headers)?void 0:k[z.NEXT_CACHE_TAGS_HEADER];O&&al&&c&&"string"==typeof c&&b.setHeader(z.NEXT_CACHE_TAGS_HEADER,c);let d=q.segmentData.get(ax);return void 0!==d?(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:y.default.fromStatic(d,u.RSC_CONTENT_TYPE_HEADER),cacheControl:o.cacheControl}):(b.statusCode=204,(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:y.default.EMPTY,cacheControl:o.cacheControl}))}let r=(0,h.getRequestMeta)(a,"onCacheEntry");if(r&&await r({...o,value:{...o.value,kind:"PAGE"}},{url:(0,h.getRequestMeta)(a,"initURL")}))return null;if(p&&av)throw Object.defineProperty(Error("Invariant: postponed state should not be present on a resume request"),"__NEXT_ERROR_CODE",{value:"E396",enumerable:!1,configurable:!0});if(q.headers){let a={...q.headers};for(let[c,d]of(O&&al||delete a[z.NEXT_CACHE_TAGS_HEADER],Object.entries(a)))if(void 0!==d)if(Array.isArray(d))for(let a of d)b.appendHeader(c,a);else"number"==typeof d&&(d=d.toString()),b.appendHeader(c,d)}let s=null==(g=q.headers)?void 0:g[z.NEXT_CACHE_TAGS_HEADER];if(O&&al&&s&&"string"==typeof s&&b.setHeader(z.NEXT_CACHE_TAGS_HEADER,s),!q.status||aq&&as||(b.statusCode=q.status),!O&&q.status&&G.RedirectStatusCode[q.status]&&aq&&(b.statusCode=200),p&&b.setHeader(u.NEXT_DID_POSTPONE_HEADER,"1"),aq&&!aa){if(void 0===q.rscData){if(q.postponed)throw Object.defineProperty(Error("Invariant: Expected postponed to be undefined"),"__NEXT_ERROR_CODE",{value:"E372",enumerable:!1,configurable:!0});return(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:q.html,cacheControl:aw?{revalidate:0,expire:void 0}:o.cacheControl})}return(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:y.default.fromStatic(q.rscData,u.RSC_CONTENT_TYPE_HEADER),cacheControl:o.cacheControl})}let t=q.html;if(!p||O||aq)return(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:t,cacheControl:o.cacheControl});if(at)return t.push(new ReadableStream({start(a){a.enqueue(A.ENCODED_TAGS.CLOSED.BODY_AND_HTML),a.close()}})),(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:t,cacheControl:{revalidate:0,expire:void 0}});let v=new TransformStream;return t.push(v.readable),m({span:c,postponed:q.postponed,fallbackRouteParams:null}).then(async a=>{var b,c;if(!a)throw Object.defineProperty(Error("Invariant: expected a result to be returned"),"__NEXT_ERROR_CODE",{value:"E463",enumerable:!1,configurable:!0});if((null==(b=a.value)?void 0:b.kind)!==w.CachedRouteKind.APP_PAGE)throw Object.defineProperty(Error(`Invariant: expected a page response, got ${null==(c=a.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E305",enumerable:!1,configurable:!0});await a.value.html.pipeTo(v.writable)}).catch(a=>{v.writable.abort(a).catch(a=>{console.error("couldn't abort transformer",a)})}),(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:t,cacheControl:{revalidate:0,expire:void 0}})};if(!aG)return await aF.withPropagatedContext(a.headers,()=>aF.trace(i.BaseServerSpan.handleRequest,{spanName:`${aE} ${a.url}`,kind:g.SpanKind.SERVER,attributes:{"http.method":aE,"http.target":a.url}},p));await p(aG)}catch(b){throw b instanceof C.NoFallbackError||await L.onRequestError(a,b,{routerKind:"App Router",routePath:H,routeType:"render",revalidateReason:(0,f.c)({isRevalidate:al,isOnDemandRevalidate:ai})},ad),b}}},75358:()=>{},78335:()=>{},82704:()=>{},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},88800:(a,b,c)=>{"use strict";c.r(b),c.d(b,{default:()=>g,metadata:()=>e});var d=c(75338);let e={title:"MyCBCT — Staff Guide",description:"Staff guide for managing patients and appointments in the MyCBCT portal."},f=`
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .sg-root {
    font-family: Georgia, serif;
    background: #f0ede6;
    color: #1a1a1a;
    line-height: 1.7;
    font-size: 17px;
  }

  .cover {
    background: #0e1b2e;
    color: #f7f4ec;
    padding: 80px 40px;
    text-align: center;
    min-height: 340px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .cover-sub {
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    margin-bottom: 12px;
  }
  .cover-logo {
    font-size: 48px;
    font-weight: 700;
    color: #e7ae3b;
    margin-bottom: 8px;
    letter-spacing: -1px;
  }
  .cover-tagline {
    font-size: 18px;
    color: rgba(247,244,236,0.65);
    margin-bottom: 32px;
  }
  .cover-divider {
    width: 60px;
    height: 2px;
    background: #e7ae3b;
    margin: 0 auto 32px;
  }
  .cover-title {
    font-size: 30px;
    font-weight: 600;
    color: #f7f4ec;
    margin-bottom: 12px;
  }
  .cover-desc {
    font-size: 16px;
    color: rgba(247,244,236,0.55);
    max-width: 480px;
  }

  .reassurance {
    background: #e7ae3b;
    padding: 24px 40px;
    text-align: center;
  }
  .reassurance p {
    font-size: 16px;
    color: #0e1b2e;
    font-weight: 600;
    margin: 0;
  }

  .content {
    max-width: 780px;
    margin: 0 auto;
    padding: 60px 40px;
  }

  .section {
    margin-bottom: 64px;
  }

  .section-number {
    display: inline-block;
    background: #e7ae3b;
    color: #0e1b2e;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 4px 14px;
    border-radius: 999px;
    margin-bottom: 14px;
  }

  .section-title {
    font-size: 28px;
    font-weight: 700;
    color: #0e1b2e;
    margin-bottom: 8px;
    line-height: 1.2;
  }

  .section-intro {
    font-size: 16px;
    color: #555;
    margin-bottom: 28px;
    max-width: 580px;
  }

  .steps {
    list-style: none;
    counter-reset: steps;
  }

  .step {
    counter-increment: steps;
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    align-items: flex-start;
  }

  .step-num {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    background: #0e1b2e;
    color: #e7ae3b;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 16px;
    font-weight: 700;
    margin-top: 2px;
  }

  .step-body {
    flex: 1;
    background: #fff;
    border-radius: 12px;
    padding: 18px 22px;
    border-left: 4px solid #e7ae3b;
  }

  .step-body strong {
    display: block;
    font-size: 17px;
    color: #0e1b2e;
    margin-bottom: 6px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }

  .step-body p {
    font-size: 15px;
    color: #444;
    margin: 0;
    line-height: 1.6;
  }

  .tip {
    background: rgba(231,174,59,0.12);
    border: 1px solid rgba(231,174,59,0.4);
    border-radius: 12px;
    padding: 18px 22px;
    margin-top: 20px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .tip-icon {
    font-size: 22px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .tip p {
    font-size: 15px;
    color: #555;
    margin: 0;
    line-height: 1.6;
  }

  .tip strong {
    color: #0e1b2e;
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }

  .dont-worry {
    background: #0e1b2e;
    border-radius: 12px;
    padding: 20px 24px;
    margin-top: 20px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .dont-worry p {
    font-size: 15px;
    color: rgba(247,244,236,0.8);
    margin: 0;
    line-height: 1.6;
  }

  .dont-worry strong {
    color: #e7ae3b;
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }

  .divider {
    height: 1px;
    background: #ddd9d0;
    margin: 64px 0;
  }

  .quick-ref {
    background: #0e1b2e;
    border-radius: 16px;
    padding: 36px 40px;
    margin-bottom: 64px;
  }

  .quick-ref h2 {
    font-size: 22px;
    color: #e7ae3b;
    margin-bottom: 24px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 700;
  }

  .quick-ref-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .quick-ref-item {
    background: rgba(247,244,236,0.06);
    border-radius: 10px;
    padding: 16px 18px;
  }

  .quick-ref-item .label {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(247,244,236,0.4);
    font-family: 'Helvetica Neue', Arial, sans-serif;
    margin-bottom: 6px;
  }

  .quick-ref-item .value {
    font-size: 15px;
    color: #f7f4ec;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 600;
  }

  .quick-ref-item .value a {
    color: #e7ae3b;
    text-decoration: none;
  }

  .glossary-item {
    display: flex;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid #ddd9d0;
    align-items: flex-start;
  }

  .glossary-item:last-child {
    border-bottom: none;
  }

  .glossary-term {
    flex-shrink: 0;
    width: 140px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #0e1b2e;
    padding-top: 2px;
  }

  .glossary-def {
    font-size: 15px;
    color: #555;
    line-height: 1.6;
  }

  .footer {
    background: #0e1b2e;
    padding: 40px;
    text-align: center;
  }

  .footer p {
    font-size: 13px;
    color: rgba(247,244,236,0.35);
    margin: 0;
  }

  .footer .logo {
    font-size: 20px;
    color: #e7ae3b;
    margin-bottom: 8px;
    font-weight: 700;
  }

  .button-example {
    display: inline-block;
    background: #e7ae3b;
    color: #0e1b2e;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 700;
    font-size: 15px;
    padding: 10px 24px;
    border-radius: 999px;
    margin: 4px 0;
    text-decoration: none;
  }

  .button-example.dark {
    background: #0e1b2e;
    color: #e7ae3b;
  }

  .button-example.outline {
    background: none;
    border: 2px solid #0e1b2e;
    color: #0e1b2e;
  }

  @media (max-width: 600px) {
    .content { padding: 40px 20px; }
    .quick-ref-grid { grid-template-columns: 1fr; }
    .cover { padding: 60px 24px; }
    .cover-logo { font-size: 36px; }
    .cover-title { font-size: 24px; }
  }
</style>

<div class="sg-root">

<div class="cover">
  <p class="cover-sub">By 360 Visualise</p>
  <p class="cover-logo">MyCBCT</p>
  <p class="cover-tagline">The CBCT referral portal</p>
  <div class="cover-divider"></div>
  <h1 class="cover-title">Staff Guide</h1>
  <p class="cover-desc">Everything you need to know to manage patients and appointments — explained simply, step by step.</p>
</div>

<div class="reassurance">
  <p>💛 &nbsp; Don't worry — you cannot break anything. If something goes wrong, just call Pete or Rachel.</p>
</div>

<div class="content">

  <div class="section">
    <p style="font-size:19px;color:#333;line-height:1.8;margin-bottom:20px;">
      Welcome to MyCBCT! This is the system we use to manage all our CBCT scan referrals — from when a dentist sends us a patient, right through to when the scan is done and delivered.
    </p>
    <p style="font-size:19px;color:#333;line-height:1.8;margin-bottom:20px;">
      <strong>Your job in the system</strong> is mainly to look at the list of patients waiting, ring them up to arrange their appointment, and book them in. That's it!
    </p>
    <div class="tip">
      <span class="tip-icon">🌟</span>
      <p><strong>The golden rule:</strong> if you're ever not sure what to do, just leave it as it is and ask Rachel. Nothing in this system is urgent and nothing will go wrong if you leave a patient for a bit.</p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <span class="section-number">Step 1</span>
    <h2 class="section-title">How to log in</h2>
    <p class="section-intro">You'll need to do this every time you use the system. It only takes a moment.</p>

    <ol class="steps">
      <li class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <strong>Open your internet browser</strong>
          <p>That's the app you use to look at websites — it might be called Safari, Chrome, or Edge. Click on it to open it.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <strong>Go to the website</strong>
          <p>Click in the address bar at the top of the screen (the long white box) and type: <strong>mycbct-portal.vercel.app</strong> — then press Enter.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <strong>Type in your email address and password</strong>
          <p>Enter the email address and password Rachel gave you. Then click the big <span class="button-example" style="font-size:13px;padding:6px 16px;">Sign in</span> button.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">4</div>
        <div class="step-body">
          <strong>You're in! 🎉</strong>
          <p>You'll see the dashboard — a list of patients waiting. This is where you'll spend most of your time.</p>
        </div>
      </li>
    </ol>

    <div class="dont-worry">
      <span style="font-size:22px;flex-shrink:0;">🔐</span>
      <p><strong>Can't log in?</strong> Don't panic. Double-check you've typed your email and password correctly — passwords are case-sensitive, so make sure Caps Lock isn't on. If it still won't work, ask Rachel to reset your password.</p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <span class="section-number">Step 2</span>
    <h2 class="section-title">Understanding the dashboard</h2>
    <p class="section-intro">When you log in, you'll see the main screen. Here's what everything means.</p>

    <ol class="steps">
      <li class="step">
        <div class="step-num">📋</div>
        <div class="step-body">
          <strong>The Action Queue — your main list</strong>
          <p>This is the list of patients who are waiting for a scan. You can see their name, what type of scan they need, and how long they've been waiting. The ones who've been waiting the longest are shown with a red badge — try to call those ones first.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">📊</div>
        <div class="step-body">
          <strong>The numbers at the top</strong>
          <p>You'll see three boxes showing how many patients are waiting, how many referrals came in this week, and how many scans have been uploaded. Don't worry too much about these — they're just useful to know.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">🔍</div>
        <div class="step-body">
          <strong>Finding a specific patient</strong>
          <p>If you need to find a particular patient, look for a search box at the top of the list. Type their name and they'll appear straight away.</p>
        </div>
      </li>
    </ol>

    <div class="tip">
      <span class="tip-icon">💡</span>
      <p><strong>Tip:</strong> You only need to worry about patients with a <span class="button-example" style="font-size:12px;padding:4px 14px;">Book →</span> button next to them. Those are the ones waiting to be booked in.</p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <span class="section-number">Step 3</span>
    <h2 class="section-title">Opening a patient's record</h2>
    <p class="section-intro">To see all the details about a patient — their contact number, what scan they need, and notes from their dentist — click on their name.</p>

    <ol class="steps">
      <li class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <strong>Click on the patient's name</strong>
          <p>Just click once on their name in the list. Their full record will open.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <strong>You'll see all their details</strong>
          <p>This includes: their scan type, date of birth, clinical notes from their dentist, and their contact details (phone number and email) if we have them.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <strong>Adding or updating contact details</strong>
          <p>If you've spoken to a patient and need to add or update their phone number or email address, scroll down to the <strong>Patient contact</strong> section. Type in the details and click <span class="button-example" style="font-size:12px;padding:5px 14px;">Save contact details</span>.</p>
        </div>
      </li>
    </ol>

    <div class="dont-worry">
      <span style="font-size:22px;flex-shrink:0;">😊</span>
      <p><strong>Go back at any time:</strong> If you want to go back to the main list, just click the <strong style="color:#e7ae3b;">← Back to dashboard</strong> link at the top of the page. Easy!</p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <span class="section-number">Step 4</span>
    <h2 class="section-title">Booking a patient's appointment</h2>
    <p class="section-intro">Once you've spoken to a patient and agreed a date and time with them, here's how to book it in.</p>

    <ol class="steps">
      <li class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <strong>Open the patient's record</strong>
          <p>Find the patient in the list and click on their name to open their record (as above).</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <strong>Click "Book appointment"</strong>
          <p>You'll see a gold strip near the top saying "No appointment booked yet." Click the <span class="button-example" style="font-size:12px;padding:5px 14px;">Book appointment</span> button on the right.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <strong>Pick the date and time</strong>
          <p>A calendar will appear showing available slots. Click on the date and time that the patient agreed to. Available slots are shown in gold.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">4</div>
        <div class="step-body">
          <strong>Confirm the booking</strong>
          <p>Click the <span class="button-example" style="font-size:12px;padding:5px 14px;">Confirm booking</span> button. The appointment is now booked!</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">5</div>
        <div class="step-body">
          <strong>The patient gets an email automatically 📧</strong>
          <p>As soon as you confirm the booking, the system automatically sends the patient a lovely confirmation email with their appointment time, our address, directions, and everything they need to know. You don't need to do anything else!</p>
        </div>
      </li>
    </ol>

    <div class="tip">
      <span class="tip-icon">📅</span>
      <p><strong>No slots available?</strong> If there are no available slots showing, it means Rachel hasn't added any yet. Let her know and she'll add some to the diary.</p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <span class="section-number">Step 5</span>
    <h2 class="section-title">What to do if a patient no longer needs a scan</h2>
    <p class="section-intro">Sometimes when you ring a patient, they might say they've already had their scan done elsewhere, or they don't want it anymore. That's fine — you can remove them from the list.</p>

    <ol class="steps">
      <li class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <strong>Open the patient's record</strong>
          <p>Find them in the list and click their name.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <strong>Scroll to the bottom and click "Archive referral"</strong>
          <p>You'll see a button at the very bottom of the page with a red outline that says <span style="display:inline-block;border:1px solid #ff9b9b;color:#ff9b9b;font-size:13px;padding:4px 14px;border-radius:999px;font-family:sans-serif;">Archive referral</span>. Click it.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <strong>Choose the reason</strong>
          <p>A small box will pop up asking why you're archiving it. Choose the reason that fits best from the list — for example "Already scanned elsewhere" or "Patient declined".</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">4</div>
        <div class="step-body">
          <strong>Click "Archive"</strong>
          <p>The patient will disappear from the main list. Don't worry — their record isn't deleted, it's just moved out of the way. Rachel can always find it again if needed.</p>
        </div>
      </li>
    </ol>

    <div class="dont-worry">
      <span style="font-size:22px;flex-shrink:0;">🗂️</span>
      <p><strong>Nothing is ever deleted:</strong> Archiving just moves the patient off the active list. Their record is always kept safely in the system. If you archive someone by mistake, just tell Rachel and she can sort it out.</p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="quick-ref">
    <h2>📌 Quick Reference</h2>
    <div class="quick-ref-grid">
      <div class="quick-ref-item">
        <div class="label">Website address</div>
        <div class="value">mycbct-portal.vercel.app</div>
      </div>
      <div class="quick-ref-item">
        <div class="label">Phone number to give patients</div>
        <div class="value">01943 601222</div>
      </div>
      <div class="quick-ref-item">
        <div class="label">Address to give patients</div>
        <div class="value" style="font-size:13px;line-height:1.5;">360 Visualise, Octagon House,<br>Bradford Road, Sandbeds,<br>West Yorkshire BD20 5LY</div>
      </div>
      <div class="quick-ref-item">
        <div class="label">What to tell patients about parking</div>
        <div class="value" style="font-size:13px;">Free parking on site</div>
      </div>
      <div class="quick-ref-item">
        <div class="label">How long is the appointment?</div>
        <div class="value">Around 15 minutes</div>
      </div>
      <div class="quick-ref-item">
        <div class="label">What should patients remove?</div>
        <div class="value" style="font-size:13px;">Earrings, glasses, hairpins</div>
      </div>
      <div class="quick-ref-item">
        <div class="label">Problems? Contact</div>
        <div class="value"><a href="mailto:pete@360v.co.uk">Pete or Rachel</a></div>
      </div>
      <div class="quick-ref-item">
        <div class="label">Patient email address</div>
        <div class="value"><a href="mailto:hello@mycbct.co.uk">hello@mycbct.co.uk</a></div>
      </div>
    </div>
  </div>

  <div class="section">
    <span class="section-number">Glossary</span>
    <h2 class="section-title">What do these words mean?</h2>
    <p class="section-intro">Some words in the system might be unfamiliar. Here's a plain English explanation of each one.</p>

    <div class="glossary-item">
      <div class="glossary-term">Referral</div>
      <div class="glossary-def">This is when a dentist sends us a patient for a scan. Each patient in our list is a "referral".</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Dashboard</div>
      <div class="glossary-def">The main screen you see when you log in — your list of patients to deal with.</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Action Queue</div>
      <div class="glossary-def">The list of patients who need something doing — usually ringing them up to book an appointment.</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">CBCT Scan</div>
      <div class="glossary-def">The type of 3D X-ray scan we do here. It stands for Cone Beam Computed Tomography — but you don't need to remember that!</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Submitted</div>
      <div class="glossary-def">The dentist has sent us the referral, but we haven't booked the patient in yet.</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Booked</div>
      <div class="glossary-def">The patient has an appointment in the diary.</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Scanned</div>
      <div class="glossary-def">The patient has come in and had their scan done.</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Archive</div>
      <div class="glossary-def">Moving a patient off the active list because they no longer need a scan. Their record is kept but they won't appear in the main list.</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Report requested</div>
      <div class="glossary-def">The dentist has asked for a written report from a specialist along with the scan. You don't need to do anything different — just be aware some scans have this.</div>
    </div>
  </div>

  <div style="background:#f7f4ec;border:2px solid #e7ae3b;border-radius:16px;padding:32px 36px;text-align:center;margin-bottom:40px;">
    <p style="font-size:28px;margin-bottom:12px;">😊</p>
    <h3 style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:20px;color:#0e1b2e;margin-bottom:12px;">You're doing brilliantly.</h3>
    <p style="font-size:16px;color:#555;line-height:1.7;max-width:480px;margin:0 auto;">Remember — you cannot break anything. If you're ever unsure, just ask Rachel or Pete. Everyone here is on hand to help, and no question is ever a silly one.</p>
  </div>

</div>

<div class="footer">
  <p class="logo">MyCBCT</p>
  <p>By 360 Visualise &nbsp;\xb7&nbsp; Octagon House, Bradford Road, Sandbeds, West Yorkshire BD20 5LY &nbsp;\xb7&nbsp; 01943 601222</p>
</div>

</div>
`;function g(){return(0,d.jsx)("div",{dangerouslySetInnerHTML:{__html:f}})}},92288:(a,b,c)=>{Promise.resolve().then(c.t.bind(c,54160,23)),Promise.resolve().then(c.t.bind(c,31603,23)),Promise.resolve().then(c.t.bind(c,68495,23)),Promise.resolve().then(c.t.bind(c,75170,23)),Promise.resolve().then(c.t.bind(c,77526,23)),Promise.resolve().then(c.t.bind(c,78922,23)),Promise.resolve().then(c.t.bind(c,29234,23)),Promise.resolve().then(c.t.bind(c,12263,23)),Promise.resolve().then(c.bind(c,82146))},96487:()=>{}};var b=require("../../webpack-runtime.js");b.C(a);var c=b.X(0,[543,792],()=>b(b.s=66935));module.exports=c})();