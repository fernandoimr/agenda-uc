import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { UtilsService } from 'src/app/services/utils.service';
import { Validators, FormControl } from '@angular/forms';
import { ENV } from 'src/environments/environment';
import { AgendaAmbulatoriaService } from 'src/app/services/agenda-ambulatoria.service';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material';
import { RegistroUsuarioComponent } from 'src/app/shared/components/modals/registro-usuario/registro-usuario.component';
import { RecuperarClaveUsuarioComponent } from 'src/app/shared/components/modals/recuperar-clave-usuario/recuperar-clave-usuario.component';

@Component({
  selector: 'app-buscar-tu-medico',
  templateUrl: './buscar-tu-medico.component.html',
  styleUrls: ['./buscar-tu-medico.component.scss']
})
export class BuscarTuMedicoComponent implements OnInit {

  documento = null;
  documentoFC = new FormControl('');
  clave = new FormControl('', Validators.required);
  agendaBeneficiario;
  nuevaHoraSaludIntegral;

  @Output() datosBeneficiarioMedico: EventEmitter<any> = new EventEmitter();

  constructor(
    public utils: UtilsService,
    public agendaService: AgendaAmbulatoriaService,
    public dialog: MatDialog,
    public activateRoute: ActivatedRoute) { }

  ngOnInit() {
    localStorage.clear();
    this.activateRoute.queryParams.subscribe(params => {
      if (params['rut']) {
        this.documento = params['rut'];
        this.documentoFC.setValue(params['rut']);
        this.setFormatRut();
      }
    });

    this.agendaBeneficiario = this.utils.actionAgendaBeneficiarios().getAgenda().subscribe(res => {
      this.documento = res.idPaciente;
      this.setProfesionalRol(res.idMedicoCabecera, res);
    });

    this.nuevaHoraSaludIntegral = this.utils.actionNuevaHoraSaludIntegral().getNuevaHora().subscribe(res => {
      this.setFormatRut();
      this.buscarRut();
    });

  }

  eventEnter(event) {
    if (event.keyCode == 13) {
      this.buscarRut();
    }
  }

  restoreFormatRut() {
    if (this.documentoFC.value && this.documentoFC.value.trim() != "") {
      let documento = this.documentoFC.value.trim();
      documento = this.utils.replaceAll(documento, ".", "");
      documento = this.utils.replaceAll(documento, "-", "");
      this.documentoFC.setValue(documento);
    }
  }

  setFormatRut() {
    this.documentoFC.setValue((this.documentoFC.value) ? this.documentoFC.value.trim() : null);
    let rut = this.documentoFC.value;
    if (rut && rut != "") {
      let rutPuntos = this.utils.formatRut(rut);
      this.documentoFC.setValue(rutPuntos);
      this.documento = this.utils.replaceAll(rutPuntos, ".", "");
    }
  }



  async buscarRut() {

    let rut = this.documento;
    let clave = this.clave.value;
    let countError = 0;
    let isAutenticated = false;

    this.documentoFC.markAsTouched();

    if (!rut) {
      this.documentoFC.setErrors({ required: true });
      countError++;
    }

    if (!clave) {
      this.clave.setErrors({ required: true });
      countError++;
    }

    if (!this.utils.validateRun(this.documento)) {
      this.documentoFC.setErrors({ invalidRut: true });
      countError++;
    }

    if (countError > 0) {
      return;
    }

    this.utils.showProgressBar();

    try {
      const detalleAutenticacion: any = await this.agendaService.autenticar(rut, clave);
      if (detalleAutenticacion.statusCod === 'OK') {
        isAutenticated = true;
      } else {
        this.utils.mDialog('Estimado paciente', 'El rut y la contraseña ingresada no coinciden. Intente nuevamente', "message");
        this.utils.hideProgressBar();
        return;
      }
    } catch (err) {
      this.utils.mDialog('Estimado paciente', 'El rut y la contraseña ingresada no coinciden. Intente nuevamente', "message");
      this.utils.hideProgressBar();
      return;

    }

    this.agendaService.validarEnrolamiento(rut.split("-").join("")).then(async (res: any) => {

      const esBeneficiario = (res.estado && res.estado.toUpperCase() === 'OK');

      if (!esBeneficiario) {

        this.documentoFC.setErrors({ notFoundRut: true });
        this.utils.hideProgressBar();

      } else {

        this.documentoFC.markAsUntouched();
        this.documentoFC.setErrors({});
        const rutmed = res.beneficiario[0].idMedicoCabecera;
        res.beneficiario.forEach((val, key) => {
          val.id = val.idPaciente;
        });
        localStorage.setItem("beneficiarios", JSON.stringify(res.beneficiario));

        this.setProfesionalRol(rutmed, res.beneficiario[0])

      }

    });

  }
  async setProfesionalRol(rutmed, beneficiario) {


    try {
      this.agendaService.getDatosProfesional(null, rutmed).subscribe(async (prof: any) => {
        this.setBusquedaCalendario(prof.datosProfesional).then((busqueda: any) => {
          busqueda.fromSaludIntegral = true;
          localStorage.setItem("derivacion", JSON.stringify(beneficiario))
          this.datosBeneficiarioMedico.emit(busqueda);
          this.utils.hideProgressBar();

        }).catch(err => {
          this.utils.mDialog('Error', 'No se ha podido finalizar la consulta. Intente más tarde.', 'message');
          this.utils.hideProgressBar();
        });
      }, () => {
        this.utils.mDialog('Error', 'No se ha podido finalizar la consulta. Intente más tarde.', 'message');
        this.utils.hideProgressBar();
      });

    } catch (err) {

      this.utils.mDialog('Error', 'No se ha podido finalizar la consulta. Intente más tarde.', 'message');
      this.utils.hideProgressBar();

    }

  }

  async setBusquedaCalendario(prof) {

    return new Promise((resolve, reject) => {


      this.agendaService.getEspecialidadesByProfesional(prof.idProfesionalPRM, null).subscribe(async (srvRequest: any) => {

        try {

          let servicio = null;
          let especialidades = null;
          let listadoEspecialidades = [];

          if (srvRequest && srvRequest.especialidadesPorServicio && srvRequest.especialidadesPorServicio.length > 0) {

            especialidades = srvRequest.especialidadesPorServicio.map(item => {
              item.id = item.idServicio;
              return item;
            })

            servicio = especialidades.find(item => {
              return item.idEspecialidad === ENV.saludIntegral.idEspecialidad &&
                item.idServicio === ENV.saludIntegral.idServicio
            });

            const extrasEspecialidades = especialidades.filter(item => {
              const matchExtra = ENV.saludIntegral.mostrarEspecialidadCabeceraExtras.filter(itemExtra => {
                return item.idEspecialidad === itemExtra.idEspecialidad &&
                  item.idServicio === itemExtra.idServicio
              });
              if (matchExtra.length === 1) {
                return true;
              }
            });

            if (!servicio) {
              reject(false);
              return false;
            }

            listadoEspecialidades = [servicio]
            listadoEspecialidades = listadoEspecialidades.concat(extrasEspecialidades);

          } else {

            reject(false);
            return false;

          }

          const profesional = {
            id: prof.idProfesionalPRM,
            idProfesional: prof.idProfesionalPRM,
            nombreProfesional: `${prof.nombres} ${prof.apellidoPaterno} ${prof.apellidoMaterno}`,
            esProfesional: true,
            informacionAdicional: "",
            soloAutoPagador: null,
            urlImagenProfesional: `${prof.urlFoto}`,
            detalle: `${prof.nombres} ${prof.apellidoPaterno} ${prof.apellidoMaterno}`
          };

          const centroAtencion = {
            direccion: {
              calle: null,
              numero: null,
              piso: null,
              comuna: "Región Metropolitana"
            },
            horaApertura: null,
            horaCierre: null,
            idCentro: ENV.idRegion,
            idRegion: ENV.idRegion,
            latitud: null,
            longitud: null,
            nombre: "Todos",
            codigo: "todos",
            detalle: "Todos - Región Metropolitana"
          };

          const centrosDisponibles = [];
          const area = ENV.areaConsultaMedica;
          const idPaciente = await this.getDatosPaciente();
          const documentoPaciente = {
            tipoDocumento: "RUN",
            documento: this.documento,
            documentoFormateado: this.utils.formatRut(this.documento),
            idPaciente: idPaciente
          };

          const especialidad = servicio;

          const datosImagenes = {
            aplicaMedioContraste: false,
            archivo: null,
            requierePresupuesto: false,
            idEncuesta: null
          };

          const busqueda = {
            area,
            profesional,
            especialidad,
            centroAtencion,
            documentoPaciente,
            centrosDisponibles,
            fromSaludIntegral: true,
            datosImagenes,
            listadoEspecialidades: listadoEspecialidades
          };

          localStorage.setItem('profesionalCabeceraCalendario', JSON.stringify(busqueda));
          this.utils.saludIntegralVolver().setVolver('VISTA_DERIVACION');

          resolve(busqueda);


        } catch (err) {

          reject(false);
          this.utils.hideProgressBar();

        }

      });

    });


  }

  getDatosPaciente() {
    return new Promise((resolve, reject) => {

      try {
        const tipoDocumento = 'RUN';
        const documento = this.documento;
        this.agendaService.getPaciente(documento, tipoDocumento, ENV.areaConsultaMedica).subscribe((res: any) => {
          if (res && res.listaPacientes && res.listaPacientes.length > 0) {
            resolve(res.listaPacientes[0].id);
            return;
          }
          resolve(null);
        }, () => {
          resolve(null);
        });

      } catch (err) {
        resolve(null);

      }
    });
  }

  registrarse() {
    this.dialog.open(RegistroUsuarioComponent, {
      data: null,
      width: '720px',
      autoFocus: false,
      disableClose: true
    });
  }

  recuperarClave() {
    this.dialog.open(RecuperarClaveUsuarioComponent, {
      data: null,
      width: '480px',
      autoFocus: false,
      disableClose: true
    });
  }

}
