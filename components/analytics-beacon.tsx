export function AnalyticsBeacon({eventName,templateId}:{eventName:"template_viewed"|"template_selected";templateId?:string}) {
  const payload = JSON.stringify({ eventName, templateId });
  const script = `(function(){var p=${JSON.stringify(payload)};var send=function(body){fetch('/api/v1/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true}).catch(function(){})};var view=function(){send(p)};if('requestIdleCallback'in window){requestIdleCallback(view,{timeout:4000})}else{setTimeout(view,2500)}document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('[data-template-selection]'):null;if(t){send(JSON.stringify({eventName:'template_selected',templateId:t.getAttribute('data-template-selection')}))}},true)})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
