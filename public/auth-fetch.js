(()=>{
  const KEY='nexa.user.session';
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url.startsWith('/v1/')&&!url.startsWith('/v1/auth/')&&!url.startsWith('/v1/admin/')){
      const token=sessionStorage.getItem(KEY);
      if(token){const h=new Headers(init.headers||{});if(!h.has('authorization'))h.set('authorization','Bearer '+token);init={...init,headers:h};}
    }
    const r=await nativeFetch(input,init);
    if(r.status===401&&url.startsWith('/v1/')&&!url.startsWith('/v1/auth/')&&!location.pathname.startsWith('/auth')){
      sessionStorage.removeItem(KEY);
      location.replace('/auth.html?next='+encodeURIComponent(location.pathname+location.search));
    }
    return r;
  };
})();