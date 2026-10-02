'use strict';

const {noStore,requireCloud}=require('../_lib/backend');

module.exports = function handler(req,res){
  noStore(res);
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('Allow','GET, POST');
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }

  if(!requireCloud(res)) return;

  // Fail closed until authenticated per-user sync is wired to RLS-protected storage.
  return res.status(501).json({
    ok:false,
    error:'not_implemented',
    message:'Synchronizacja jest zarezerwowana do czasu podłączenia auth + RLS.'
  });
};
