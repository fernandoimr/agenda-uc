import { Injectable } from '@angular/core';
import { ENV } from 'src/environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AgendaAmbulatoriaService {

  public servRoute: string = ENV.servRoute;
  public profRoute: string = ENV.profRoute;
  public baseApi: string;
  public httpOptions: any;

  constructor(public http: HttpClient) {
    this.baseApi = ENV.baseApi + this.servRoute;
    this.httpOptions = {
      headers: new HttpHeaders({
        'X-AppTimezone': "-180",
        'Content-Type': "application/json;",
      //  'Authorization': "Bearer " + ENV.tokenAutenticar
      })
    };
  }

  getAreas() {
    return this.http.get(this.baseApi + '/Areas?codCanal=PatientPortal');
  }

  getEspecialidadesByGeneric(idArea: any, filtro: any = null, idServicio: string = null) {
    let keyf = (filtro) ? '&filtro=' + filtro : '';
    let ids = (idServicio) ? '&idServicio=' + idServicio : '';

    return this.http.get(this.baseApi + '/Especialidades?codCanal=PatientPortal&idArea=' + idArea + keyf + ids);
  }

  getEspecialidadesByProfesional(idProfesional: string, idArea: string, filtro: any = null) {
    let keyf = (filtro) ? '&filtro=' + filtro : '';
    const area = idArea ? '&idArea=' + idArea : '';
    return this.http.get(this.baseApi + '/Servicios/Rel/Especialidades?codCanal=PatientPortal&idProfesional=' + idProfesional + area + keyf);
  }

  getProfesionales(idArea: string, filtro: any = null, idProfesional: string = null) {
    let keyf = (filtro) ? '&patronNombre=' + filtro : '';
    let idp = (idProfesional) ? '&idProfesional=' + idProfesional : '';

    return this.http.get(this.baseApi + '/Profesionales?codCanal=PatientPortal&idArea=' + idArea + keyf + idp);
  }

  getServiciosByEspecialidad(idEspecialidad, idArea) {
    const area = idArea ? '&idArea=' + idArea : '';
    return this.http.get(this.baseApi + '/Servicios?codCanal=PatientPortal' + area + '&idEspecialidad=' + idEspecialidad).toPromise();

  }

  getProfesionalesByQuery(query: string) {
    return this.http.get(this.baseApi + '/Profesionales?codCanal=PatientPortal&' + query);
  }

  getCentrosByEspecialidad(idServicio: string, idArea: string, idProfesional = null, fromSel = false) {
    let queryProfesional = (idProfesional) ? '&idProfesional=' + idProfesional : '';
    queryProfesional += fromSel ? '&fromSelCentros=true' : '';
    return this.http.get(this.baseApi + '/Centros?codCanal=PatientPortal&idServicio=' + idServicio + '&idArea=' + idArea + queryProfesional);
  }

  getRecursos(queryData: any) {

    let queryProfesional = (queryData.idProfesional) ? '&profesional=' + queryData.idProfesional : '';
    let queryCentro = (queryData.todosCentro) ? '&idRegion=' + queryData.idCentro : '&idCentro=' + queryData.idCentro;
    let endpoint = (queryData.idProfesional) ? 'CuposProfFechas' : 'CuposEspecCentro';
    let fromProfRel = (queryData.fromProfRel) ? '&fromProfRel=true' : '';
    let idArea = (queryData.idArea === 'RIS_IMAGENES') ? '&idArea=RIS_IMAGENES' : '';
    let codCanal = (queryData.idArea !== 'RIS_IMAGENES') ? '&codCanal=PatientPortal' : '';
    let idPaciente = (queryData.idPaciente) ? '&idPaciente=' + queryData.idPaciente : '';

    return this.http.get(this.baseApi +
      '/Agenda/' + endpoint + '?tipoResponse=2&fechaInicio=' + queryData.fechaInicio + '&fechaTermino=' + queryData.fechaTermino +
      '&idServicio=' + queryData.idServicio + '&idPlanSalud=' + queryData.idPlanSalud + queryProfesional + queryCentro + fromProfRel + idArea + codCanal + idPaciente
    );
  }

  getPaciente(idn: string, tipoIdPaciente: string, idArea) {
    const area = idArea === 'RIS_IMAGENES' ? '&contextoCod=RIS' : ''
    return this.http.get(this.baseApi + '/Pacientes?codCanal=PatientPortal&idPaciente=' + idn + '&tipoIdPaciente=' + tipoIdPaciente + '&paisIdentificador=CL');
  }

  postPaciente(data: any) {
    return this.http.post(this.baseApi + '/Pacientes', data, this.httpOptions);
  }

  putPaciente(data: any) {
    return this.http.put(this.baseApi + '/Pacientes', data, this.httpOptions);
  }

  postCita(data: any) {
    return this.http.post(this.baseApi + '/Citas', data, this.httpOptions);
  }

  getPlanesSalud(idPaciente, data = null) {
    let queryString = (idPaciente) ?
      'idPaciente=' + idPaciente :
      'tipoIdPaciente=' + data['tipoDocumento'] + '&idPaciente=' + data['documento'] + '&paisIdentificador=CL'

    return this.http.get(this.baseApi + '/PlanesDeSalud?codCanal=PatientPortal&' + queryString);
  }

  getDatosProfesional(idProfesional: any, rut: string = null) {
    const qstr = (rut) ? `rutProfesional=${rut}` : `codCanal=PatientPortal&idProfesional=${idProfesional}&tipoIdProfesional=PRM`;
    return this.http.get(ENV.baseApi + this.profRoute + '/Perfil?' + qstr);
  }

  geReglasValidacion(query: any) {
    const idArea = query.idArea === 'RIS_IMAGENES' ? '&idArea=RIS_IMAGENES' : '';
    return this.http.get(this.baseApi + '/Agenda/CuposDisponibilidad?codCanal=PatientPortal&idCentro=' + query.idCentro + '&fechaInicio=' + query.fechaInicio + '&fechaTermino=' + query.fechaTermino + '&idServicio=' + query.idServicio + '&idPlanSalud=' + query.idPlanSalud + '&idPaciente=' + query.idPaciente + '&idDisponibilidad=' + query.idDisponibilidad + '&idProfesional=' + query.idProfesional + '&codCanal=PatientPortal' + idArea)
  }

  getMensajes(data, idArea, type = null) {

    let qrProf = "";
    if (data.ResourceId && data.ResourceId != "") {
      qrProf += '&idProfesional=' + data.ResourceId;
    }

    if (idArea === 'RIS_IMAGENES') {
      qrProf += '&idArea=RIS_IMAGENES'
    }

    return this.http.get(this.baseApi + '/Mensajes?idCentro=' + data.CenterId + '&codCanal=PatientPortal&idServicio=' + data.ServiceId + qrProf);
  }

  buscarCita(data) {
    return this.http.get(this.baseApi + '/Citas/Lista?codCanal=PatientPortal&idPaciente=' + data.idPaciente + '&tipoIdPaciente=' + data.tipoIdPaciente + '&paisIdentificador=CL&fechaCita=' + data.fechaCita);
  }

  cambiarEstadoCita(data) {
    return this.http.put(this.baseApi + '/Citas', data, this.httpOptions);
  }

  postListaDeEspera(data) {
    return this.http.post(this.baseApi + '/ListaDeEspera/Pacientes', data).toPromise();
  }

  getCuposInmediatos() {
    return this.http.get(this.baseApi + '/Agenda/CuposInmediatos?codCanal=PatientPortal&idArea=' + ENV.areaConsultaMedica.id).toPromise();
  }

  getPaises() {
    return this.http.get(this.baseApi + '/Paises?codCanal=PatientPortal').toPromise();
  }

  getRegiones(codPais) {
    return this.http.get(this.baseApi + '/Regiones/Pais?codCanal=PatientPortal&codPais=' + codPais).toPromise();
  }

  getComunas(idRegion) {
    return this.http.get(this.baseApi + '/Comunas/Region?codCanal=PatientPortal&idRegion=' + idRegion).toPromise();
  }

  postProcedimiento(data) {
    return this.http.post(this.baseApi + '/SolicitudProcedimiento', data).toPromise();
  }

  getReglasExclusion(codContexto, data) {

    const idServicio = '&idServicio=' + data.idServicio;
    const idCentro = data.idCentro ? '&idCentro=' + data.idCentro : '';
    const idProfesional = data.idProfesional ? '&idProfesional=' + data.idProfesional : ''

    return this.http.get(this.baseApi + '/ReglasExclusion/Validar?codCanal=PatientPortal&codContexto=' + codContexto + idCentro + idServicio + idProfesional).toPromise();
  }

  getEncuesta(idServicio, idCentro, medioContraste) {
    return this.http.get(this.baseApi + `/Encuesta/Obtener?codCanal=PatientPortal&codExamen=${idServicio}&codCentro=${idCentro}&medioContraste=${medioContraste}`).toPromise();
  }

  postEncuesta(data) {
    return this.http.post(this.baseApi + `/Encuesta/Registrar`, data).toPromise();
  }

  validarEnrolamiento(rut) {
    return this.http.get(`${ENV.validarEnrolamiento}?rut=${rut}`).toPromise();
  }

  autenticar(username, password) {
    const httpHd =  {
      headers: new HttpHeaders({
        'Content-Type': "application/json;"
      })
    };


    return this.http.post(ENV.baseApi + ENV.pathAutenticar, { username, password }, httpHd).toPromise();

  }

  getDerivacionesToken() {
    const httpHd =  { 
      headers: new HttpHeaders({
    //    'Content-Type': "application/json;"
      })
    };

    return this.http.post(ENV.derivaciones.url, { user: ENV.derivaciones.user, password : ENV.derivaciones.pass }, httpHd).toPromise();

  }

  getDerivaciones(){
    const httpHd =  { 
      headers: new HttpHeaders({
        'Content-Type': "application/json;",
        "Authorization" : "Bearer " + ENV.derivaciones.token
      })
    };

    return this.http.post(ENV.derivaciones.consultaDerivacion, { idPaciente: '19501621-6', estadoDerivacion : 'VIGENTE' }, httpHd).toPromise();

  }

  guardarUsuario(data) {
    return this.http.post(ENV.baseApi + ENV.pathUsuarios + '/Usuarios', data).toPromise()
  }

  validarUsuario(data) {
    return this.http.post(ENV.baseApi + ENV.pathUsuarios + '/Confirmar', data).toPromise()
  }

  recuperarClave(rut) {
    return this.http.get(ENV.baseApi + ENV.pathUsuarios + '/Usuarios/ResetearPass?username=' + rut).toPromise()
  }

  cambiarClave(data) {
    return this.http.post(ENV.baseApi + ENV.pathUsuarios + '/Usuarios/ResetearPass', data).toPromise()
  }
}
