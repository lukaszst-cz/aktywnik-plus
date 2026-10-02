'use strict';

const {noStore,requireCloud}=require('../_lib/backend');

module.exports = function handler(req,res){
  noStore(res);
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('Allow','GET, POST');
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }

  if(!requireCloud(res)) return;

  // Fail closed until the database/auth adapter is connected and RLS tests pass.
  return res.status(501).json({
    ok:false,
    error:'not_implemented',
    message:'Endpoint klas jest zarezerwowany dla Aktywnik+ School i czeka na adapter bazy.'
  });
};
