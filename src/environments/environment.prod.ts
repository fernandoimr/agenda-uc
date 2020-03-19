// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: true
};

export const ENV = {
   baseApi: 'https://apigw.ucchristus.cl',
   servRoute: '/agendaambulatoria-prod',
   profRoute: '/profesionales-prod',
   idPlanSaludInit: '0b7a577d-6364-4b28-b2ba-a96e00e243ac',
   idCentrosNoDisponibles: [],
   idCentroPrioritario: '52e43c90-8ab7-4e34-afcb-a96f0106bbd1',
   mensajeSinCupos : '<h5>Sin disponibilidad en agendamiento web. En caso de requerir atención presencial para vacunación por campaña influenza ministerial, ésta será por orden de llegada.</h5>'
}

//   idCentrosNoDisponibles: ['52e43c90-8ab7-4e34-afcb-a96f0106bbd1']
