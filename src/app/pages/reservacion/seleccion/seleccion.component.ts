import { Component, OnInit, Input, Output, EventEmitter, OnChanges, ViewChild, HostListener } from '@angular/core';
import { UtilsService } from 'src/app/services/utils.service';
import { AgendaAmbulatoriaService } from 'src/app/services/agenda-ambulatoria.service';
import { MatCalendarCellCssClasses } from '@angular/material';
import { MatDialog } from '@angular/material';
import { OrderPipe } from 'ngx-order-pipe';
import { ENV, EspecialidadesDerivaciones } from 'src/environments/environment';
import gtag, { install } from 'ga-gtag';
import * as $ from 'jquery';
import 'moment-timezone';
import { DomSanitizer } from '@angular/platform-browser';
import { DeviceDetectorService } from 'ngx-device-detector';
import * as clone from 'clone';

@Component({
  selector: 'app-seleccion',
  templateUrl: './seleccion.component.html',
  styleUrls: ['./seleccion.component.scss']
})
export class SeleccionComponent implements OnInit, OnChanges {

  @Input() busquedaInicial: any;
  @Input() reloadBusqueda: number = 0;
  @Input() removerDerivacion = false;
  @Output() calendario: EventEmitter<any> = new EventEmitter();
  @Output() readQuery: EventEmitter<any> = new EventEmitter();
  @Output() listaEspera: EventEmitter<any> = new EventEmitter();
  @Output() procedimiento: EventEmitter<any> = new EventEmitter();

  public recursos: any;
  public fechaHoy: Date;
  public fechaLimite: Date;
  public datesToHighlight: any = {}
  public selectedDate: any = {};
  public maxNumDays: number = 90;
  public centrosProfesional: any = {};
  public loadedRecursos: boolean = false;
  public tiposCitas: any = [];
  public dayWeekFixed = false;
  public counterLoader = 0;
  public displayCalendar: boolean = true;
  public contadorMeses = 1;
  public enableScroll: boolean = false;
  public compensacion = -240;
  public horaSeleccionada: any;
  public navDirection = 'next';
  public enableAutoSearch = false;
  public numberSearchs = 0;
  public maxNumberSearch = 6;
  public navigationDate = { min: null, max: null }
  public disableNavigation = false;
  public emitterReloadBusqueda: any;
  public customMensaje: string = "";
  public keepSearching = true;
  public listaFechas = {};
  public medicosAsociados = [];
  public isProcedimiento = false;
  public nActivosFiltroCentro = 0;
  public nActivosFiltroHoras = 0;
  public centroTodos = false;
  public filtroHoras = 'ALL';
  public today;
  public filtroAplicado = false;
  public centrosFiltros = [];
  public recursoCache: string = "";
  public derivacion = false;
  public idLaboratorioClinico = ENV.idLaboratorioClinico;
  public volverSaludIntegral;
  public profesionalCabecera;
  public beneficiarioSelected;
  public beneficiarioTitular;
  public isTitular = true;
  public beneficiarios = [];
  public especialidadSelected;
  public filtro: any = {
    idCentro: ENV.idRegion,
    nombre: 'TODOS'
  }
  public ginecologia = ENV.ginecologia;
  public oftalmologia = ENV.oftalmologia;
  public EspecialidadesDerivaciones = EspecialidadesDerivaciones;
  public modelEspDeriv;

  constructor(
    public agendaService: AgendaAmbulatoriaService,
    public utils: UtilsService,
    public dialog: MatDialog,
    public sanitizer: DomSanitizer,
    public orderPipe: OrderPipe,
    private deviceService: DeviceDetectorService
  ) { 
    this.volverSaludIntegral = this.utils.actionSaludIntegralVolver().getVolver().subscribe( data => {
      switch(data){
        case 'VISTA_AGENDA_PROFESIONAL':
          this.utils.showProgressBar();
          setTimeout(()=> {
            this.derivacion = true;
            this.utils.saludIntegralVolver().setVolver('VISTA_DERIVACION');
            this.utils.hideProgressBar();
          },3000);
        break;
        
        case 'VISTA_DERIVACION_TITULAR':
          this.utils.showProgressBar();
          setTimeout(()=> {
            this.derivacion = true;
            this.utils.saludIntegralVolver().setVolver('VISTA_DERIVACION');
            this.verAgendaDerivacion(true);
          },3000)
        break;

        case 'VISTA_CALENDARIO':
          this.removerDerivacion = false;
          this.utils.saludIntegralVolver().setVolver('VISTA_DERIVACION');
          this.utils.especialidadDerivaciones().setEspecialidad(this.profesionalCabecera);
          break;
      }
    })
  }

  ngOnInit() {
    this.today = new Date(this.utils.toLocalScl(new Date(), this.compensacion, 'YYYY-MM-DDTHH:mm:ss'));
  }

  getOffsetTop(element) {
    let offsetTop = 0;
    while (element) {
      offsetTop += element.offsetTop;
      element = element.offsetParent;
    }
    return offsetTop;
  }

  async setDerivacion(status){
    this.derivacion = status;
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event) {
    //if (this.enableScroll) {
    let wPos = window.scrollY;
    let dayWeekPos = this.getOffsetTop((<HTMLElement>document.getElementById('dayWeek')));
    this.dayWeekFixed = (wPos >= dayWeekPos) ? true : false
    // }

  }

  ngOnChanges() {

    if (this.busquedaInicial) {

      this.navigationDate = { min: null, max: null };
      this.counterLoader = 0;
      this.navDirection = 'next';
      this.isProcedimiento = this.busquedaInicial.area.id === ENV.idExamenProcedimiento;
      this.centroTodos = (this.busquedaInicial.centroAtencion.nombre.toLowerCase() === 'todos') ? true : false;
      this.setRecursosCache().clearItem();
      this.recursos = null;
      
      if (this.busquedaInicial && this.busquedaInicial.especialidad) {
        this.displayCalendar = true;
        this.resetCalendario();
        this.crearListaFechas();
        if (this.busquedaInicial.profesional) {
          setTimeout(() => {
            this.utils.setDataProfesionalRelacionado(clone(this.busquedaInicial));
          }, 3000);
          this.getRecursos(this.busquedaInicial.profesional.idProfesional);
        } else {
          this.getRecursos();
        }

      } else {
        this.resetCalendario();
      }
      this.cambiarFiltroHoras('ALL');

      if(this.busquedaInicial.fromSaludIntegral && !this.busquedaInicial.fromMedicosRelacionados){
        const der = JSON.parse(localStorage.getItem('derivacion'));
        this.beneficiarios = JSON.parse(localStorage.getItem('beneficiarios'));
        this.busquedaInicial.derivacion = der.derivacion;
        this.beneficiarioTitular = this.beneficiarios[0];
        this.beneficiarioSelected = der;

        this.setDerivacion(this.removerDerivacion ? false : true);
        this.profesionalCabecera = JSON.parse(localStorage.getItem("profesionalCabeceraCalendario"));

        if( !this.especialidadSelected){
          this.especialidadSelected = this.busquedaInicial.listadoEspecialidades[0];
        }

      }else if(this.busquedaInicial.fromSaludIntegral && this.busquedaInicial.fromMedicosRelacionados){
        this.utils.saludIntegralVolver().setVolver('VISTA_DERIVACION_TITULAR');
        this.setDerivacion(false);
      }
      
    }
  }

  verAgenda(){
    this.utils.showProgressBar();
    setTimeout(()=> {
      this.derivacion = false;
      this.utils.saludIntegralVolver().setVolver('VISTA_AGENDA_PROFESIONAL');
      this.utils.hideProgressBar();
    },3000)
  }

  determinarMesSinCupo() {
    this.recursos.forEach((val, key) => {
      let posee = false;
      let listFechaDis = Object.keys(val['fechasDisponibles']);
      listFechaDis.forEach(k => {
        let fechaEvaluar = new Date(k + "T23:59:59");
        if (fechaEvaluar.getTime() >= this.navigationDate['min'].getTime() &&
          fechaEvaluar.getTime() <= this.navigationDate['max'].getTime() &&
          val['fechasDisponibles'][k].length > 0
        ) {
          posee = true;
        }
      });
      this.recursos[key]['poseeMes'] = posee;
    });


    this.moverSinCuposAlFinal();

  }

  moverSinCuposAlFinal(){
    const recursos = clone(this.recursos);
    const conCupos = recursos.filter( item => {
      if(item.poseeMes){
        return item;
      }
    });

    const sinCupos = recursos.filter( item => {
      if(!item.poseeMes){
        return item;
      }
    });

    this.recursos = conCupos.concat(sinCupos)
  }

  resetCalendario() {
    this.datesToHighlight = {};
    this.selectedDate = {};
    this.recursos = [];
    this.centrosProfesional = {};
    this.loadedRecursos = false;
    this.enableScroll = false;
    this.listaFechas = {};
    this.disableNavigation = false;
    this.keepSearching = true;
  }

  async navigateMonth(action, fromBtn = false) {

    this.displayCalendar = false;
    this.selectedDate = {};

    if(this.filtroAplicado){
      this.filtroAplicado = false;
      this.filtroHoras = 'ALL';
      this.filtro = {
        idCentro: ENV.idRegion,
        nombre: 'TODOS'
      }
      await this.filtrarBusqueda();
    }

    if (fromBtn) {
      this.maxNumberSearch = 5;
    }

    switch (action) {
      case 'next':
        this.counterLoader++;
        this.navDirection = 'next';
        break;

      case 'prev':
        this.counterLoader--;
        this.navDirection = 'prev';
        break;

    }

    if (this.busquedaInicial.profesional) {
      this.getRecursos(this.busquedaInicial.profesional.idProfesional);
    } else {
      this.getRecursos();
    }

  }

  filtrarRecursosSoloProfesional(data) {

    let recursos = [];
    if (data['listaRecursos']) {
      data['listaRecursos'].forEach((val, key) => {
        if (val['tipoRecurso'].toLowerCase() != 'room') {
          recursos.push(val);
        }
      })
    }
    data['listaRecursos'] = recursos;
    return data;
  }

  getRecursos(idProfesional = null, next = false) {

    return new Promise((resolve, reject) => {

      let fechaHoy = new Date();
      let fechaLimite;
      const dayToday = fechaHoy.getDate();

      if(this.counterLoader > 0){
        fechaHoy.setDate(1)
        fechaHoy.setHours(12);
        fechaHoy.setMinutes(0);
        fechaHoy.setSeconds(0);
      }

      fechaHoy.setMonth(fechaHoy.getMonth() + this.counterLoader);

      if (dayToday === 31 && this.counterLoader > 0) {
        fechaHoy.setMonth(fechaHoy.getMonth() - 1);
      }

      fechaLimite = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth() + 1, 0);
      fechaHoy = new Date(this.utils.toLocalScl(fechaHoy, this.compensacion, 'YYYY-MM-DDTHH:mm:ss'));

      if (this.counterLoader > 0) {
        fechaHoy.setDate(1)
        fechaHoy.setHours(0);
        fechaHoy.setMinutes(0);
        fechaHoy.setSeconds(0);
      }

      fechaLimite = new Date(this.utils.toLocalScl(fechaLimite, this.compensacion, 'YYYY-MM-DDTHH:mm:ss'));
      fechaLimite = new Date(fechaLimite.getFullYear(), fechaLimite.getMonth() + 1, 0);
      fechaLimite.setHours(23);
      fechaLimite.setMinutes(59);
      fechaLimite.setSeconds(59);

      this.navigationDate = { min: fechaHoy, max: fechaLimite };
      this.agendaService.getRecursos({
        todosCentro: (this.busquedaInicial.centroAtencion.codigo == 'todos') ? true : false,
        idCentro: this.busquedaInicial.centroAtencion.idCentro,
        fechaInicio: this.utils.trDateStr(fechaHoy, null, this.compensacion),
        fechaTermino: this.utils.trDateStr(fechaLimite, null, this.compensacion),
        idServicio: this.busquedaInicial.especialidad.idServicio,
        idPlanSalud: this.busquedaInicial.fromSaludIntegral ? ENV.idPlanSaludAdministrada : ENV.idPlanSaludInit,
        idProfesional: idProfesional,
        idArea: this.busquedaInicial.area.id,
        idPaciente: this.busquedaInicial.documentoPaciente.idPaciente
      }).subscribe(data => {

        data = this.filtrarRecursosSoloProfesional(data);

        if (data['listaRecursos'] && data['listaRecursos'].length > 0) {

          this.keepSearching = false;
          this.enableAutoSearch = false;
          data['listaRecursos'].forEach((val, key) => {
            data['listaRecursos'][key] = this.crearCalendario(val, fechaHoy);
          });

          const listaRecursos = this.mergeRecursos(clone(this.recursos), data['listaRecursos']);
          this.recursos = this.orderPipe.transform(listaRecursos, 'proximaFechaEpoch');
          this.setRecursosCache().clearItem();
          this.setRecursosCache().setItem(JSON.stringify(this.recursos));
          this.setCentrosBusquedas(this.recursos);
          this.enableScroll = false;
          this.readQuery.emit(true);
          this.restoreCalendar();
          this.prepareTooltip();

        } else if (this.keepSearching) {

          if (this.counterLoader < 12 && this.navDirection == 'next') {

            this.enableAutoSearch = true;
            this.readQuery.emit(false);
            this.numberSearchs++;

            if (this.numberSearchs <= this.maxNumberSearch) {

              this.navigateMonth('next');

            } else {

              const usrMsg = (data['usrMsg']) ? data['usrMsg'] : ENV.mensajeSinCupos;
              this.setCalendarInfo(idProfesional, usrMsg);
              this.numberSearchs = 0;
              this.disableNavigation = true;

            }

          }

        } else {
          this.setRecursosCache().clearItem();
          this.setRecursosCache().setItem(JSON.stringify(this.recursos));
          this.setCentrosBusquedas(this.recursos);
          this.restoreCalendar();
        }

        this.determinarMesSinCupo();
        resolve(data);

      })
    })

  }


  setCentrosBusquedas(recursos) {

    this.busquedaInicial.centrosDisponibles = [];
    recursos.forEach((val, key) => {
      val['listaCuposMes'].forEach((valLC, keyLC) => {
        let foundCentro = false;
        valLC['centro']['nombreCentro'] = valLC['centro']['nombre'];
        valLC['centro']['idCentro'] = valLC['centro']['id'];
        this.busquedaInicial.centrosDisponibles.forEach((valCD, keyCD) => {
          if (valCD['idCentro'] === valLC['centro']['idCentro']) {
            foundCentro = true;
          }
        });

        if (!foundCentro) {
          this.busquedaInicial.centrosDisponibles.push(valLC['centro']);
        }
      });
    });

//    if (this.busquedaInicial.centrosDisponibles.length > 1) {
      this.busquedaInicial.centrosDisponibles.unshift({
        idCentro: ENV.idRegion,
        nombre: 'Todos los centros',
        detalle: 'Todos - Región Metropolitana'
      })
//    }
  }

  prepareTooltip() {

    if (!this.deviceService.isDesktop()) {
      return false;
    }

    const isThis = this;
    setTimeout(() => {
      $(".mat-calendar").each(function (idx, val) {
        const idRecurso = $(this).attr("data-recurso");

        $(this).find('.mat-calendar-body-cell').each(function (idx2, val2) {
          const diaCalendario = $(this).text();

          const thisDate = new Date(isThis.utils.toLocalScl(isThis.navigationDate.min.setHours(12), isThis.compensacion, 'YYYY-MM-DDTHH:mm:ss'));
          thisDate.setDate(parseInt(diaCalendario));
          const fechaStr = thisDate.toISOString().split("T")[0];
          let cupos = [];

          isThis.recursos.forEach((vRe, kRey) => {
            if (idRecurso === vRe['id']) {
              cupos = vRe['fechasDisponibles'][fechaStr];
              if (cupos.length > 0) {
                $(this).addClass('diaCupo');
              }
              $(this).attr('data-cupos', JSON.stringify(cupos));
            }
          });

        });
      });
      isThis.setTooltip();
    }, 2000);
  }

  setTooltip() {
    const isThis = this;
    $(".diaCupo").mouseover(function (e, args) {
      const cupos = JSON.parse($(this).attr("data-cupos"));
      const centrosCupos = isThis.getNCentros(cupos);
      let tooltipHtml = '';
      let i = 0;
      centrosCupos.forEach((val, key) => {
        $(this).find('.tooltipCalendar').remove();
        const colorCentro = isThis.utils.getColorCentro(isThis.centroTodos ? val['id'] : null);
        const nombreCentro = val['nombreCentro'];
        const cantidadCupos = val['cupos'].length;
        const cuposOrdenados = isThis.orderPipe.transform(val['cupos'], 'horaEpoch');
        const hora = cuposOrdenados[0]['hora'];

        if (i > 0) {
          tooltipHtml += `<div class="divider"></div>`;
        }

        tooltipHtml += `
            <div class="padd-tt">
               <p class="itm-centro-tt" style="font-size: 13px !important;color: ${colorCentro};font-weight: bold;">
               <span class="circ-tt" style="background: ${colorCentro};"></span>${nombreCentro}</p>
               <p class="detalle-tt" style="font-size:13px !important">
                  <span class="sminfo-tt" style="font-size: 9px !important;line-height: 18px;">Quedan <b style="font-weight:bold !important;">${cantidadCupos}</b> cupo(s) disponibles</span>
                  <span class="val-tt" style="font-size: 24px !important;font-weight: bold;">
                  <i style="font-size: 9px !important;" class="txtproxhora">Próxima Hora</i>${hora}</span>
               </p>
            </div>`;
        i++;
      });

      $(this).append(`
             <div class="tooltipCalendar">
              <div class="cnttt">
                  ${tooltipHtml}
                  <div class="trg-tt"></div>
                </div>
              </div>`);

    }).mouseout(function () {
      $(this).find('.tooltipCalendar').remove();
    });
  }

  restoreCalendar() {
    this.enableScroll = false;
    this.loadedRecursos = true;
    this.displayCalendar = true;
    this.dayWeekFixed = false;
    this.numberSearchs = 0;
    this.goTop();
  }

  goTop() {
 
  }

  mergeRecursos(recursosActuales, recursosNuevos) {

    let nRecursos = [];
    let found;

    recursosActuales.forEach((valRa, keyRa) => {
      valRa['listaCuposMes'] = [];
    });

    recursosNuevos.forEach((valRn, keyRn) => {
      
      valRn['listaCuposMes'] = valRn['listaCupos'];

      found = false;
      recursosActuales.forEach((valRa, keyRa) => {

        if (valRn['id'] === valRa['id']) {
          valRa['listaCuposMes'] = valRn['listaCupos'];
          Object.keys(valRa['fechasDisponibles']).forEach(keyRaFd => {
            if (valRa['fechasDisponibles'][keyRaFd].length > 0) {
              valRn['fechasDisponibles'][keyRaFd] = clone(valRa['fechasDisponibles'][keyRaFd]);
            }
          });

          recursosActuales[keyRa] = valRn;
          found = true;
        }
      });

      if (!found) {
        nRecursos.push(valRn);
      }

    });

    return recursosActuales.concat(nRecursos);

  }

  setCalendarInfo(idProfesional, usrMsg) {
    this.enableAutoSearch = false;;
    this.readQuery.emit(true);
    this.recursos = [];
    this.setMensaje({
      CenterId: this.busquedaInicial.centroAtencion.idCentro,
      ServiceId: this.busquedaInicial.especialidad.idServicio,
      ResourceId: idProfesional
    }, usrMsg)
    this.enableScroll = false;
    this.loadedRecursos = true;
    this.displayCalendar = true;
    this.goTop();
  }

  setMensaje(data, usrMsg) {

    this.customMensaje = "Cargando...";

    this.agendaService.getMensajes({
      CenterId: data.CenterId,
      ServiceId: data.ServiceId,
      ResourceId: data.ResourceId
    }, 'cupo').subscribe(res => {
      this.customMensaje = "";
      if (res['mensajes'] && res['mensajes'].length > 0) {
        res['mensajes'].forEach((val, key) => {
          if (val['mensaje'] && val['mensaje']['contenido'] &&
            (
              (val['aplicaA'] && val['aplicaA']['recurso'] && data.ResourceId) ||
              (val['aplicaA'] && val['aplicaA']['servicio'] && !data.ResourceId)
            )
          ) {
            this.customMensaje += val['mensaje']['contenido'];
          }
        })
      }

      if (!this.customMensaje || this.customMensaje === "") {
        this.customMensaje = usrMsg;
      }
    })
  }
  dateClass(fechasDisponibles) {
    return (date: Date): MatCalendarCellCssClasses => {

      let response = '';
      date.setHours(date.getHours() + 6);
      const dateStr = date.toISOString().split("T")[0];
      const highlightDate = fechasDisponibles[dateStr].length === 0 ? true : false;

      if (fechasDisponibles[dateStr] && this.getNCentros(fechasDisponibles[dateStr]).length > 0) {
        response += (this.getNCentros(fechasDisponibles[dateStr]).length > 1) ? 'cupo-multiple' : `cupo-${this.getNCentros(fechasDisponibles[dateStr])[0]['id']}`
      }

      response += highlightDate ? ' day-disabled' : '';
      return response;

    };
  }

  displayCentro(idxCentro, idxItem) {

    let cet = this.centrosProfesional[idxCentro][idxItem];
    if (Object.keys(this.centrosProfesional[idxCentro]).length > 1) {
      this.centrosProfesional[idxCentro][idxItem]['habilitado'] = (cet.habilitado) ? false : true
    } else if (Object.keys(this.centrosProfesional[idxCentro]).length == 1) {
      this.centrosProfesional[idxCentro][idxItem]['habilitado'] = true;
    } else {
      this.centrosProfesional[idxCentro][idxItem]['habilitado'] = false;
    }
  }

  eligeOtroDia(i) {
    this.selectedDate[i] = null;
    this.centrosProfesional[i] = null
  }

  onSelect(event, i) {

    event.setHours(event.getHours() + 6);
    this.selectedDate[i] = event;
    let fechaDisSel = this.utils.trDateStr(event, 'json');
    let idxFecha = fechaDisSel['year'] + "-" + fechaDisSel['month'] + '-' + fechaDisSel['day'];
    let centrosProfesionales = this.recursos[i]['fechasDisponibles'][idxFecha];
    let agrupCentros: any = {};

    centrosProfesionales.forEach((val, key) => {
      if (!agrupCentros[val['centro']['id']]) {
        agrupCentros[val['centro']['id']] = { 'nombreCentro': val['centro']['nombre'], id: val['centro']['id'], cupos: [], habilitado: false }
      }
      agrupCentros[val['centro']['id']]['cupos'].push(val)
    })

    this.centrosProfesional[i] = [];
    let enableCentro = (Object.keys(agrupCentros).length == 1) ? true : false;

    Object.keys(agrupCentros).forEach(key => {
      agrupCentros[key]['habilitado'] = enableCentro;
      this.centrosProfesional[i].push(agrupCentros[key]);
    });
    const dayCal = fechaDisSel['day'] + "." + fechaDisSel['month'] + '.' + fechaDisSel['year'];
    gtag('event', 'Selección Cupo', { 'event_category': 'Seleccionar Día', 'event_label': dayCal , 'value': '0' });

  }

  getNCentros(items) {

    let agrupCentros: any = {};
    let arrCentroProfesional = [];

    items.forEach((val, key) => {
      if (!agrupCentros[val['centro']['id']]) {
        agrupCentros[val['centro']['id']] = { 'nombreCentro': val['centro']['nombre'], id: val['centro']['id'], cupos: [], horario: null }
      }
      agrupCentros[val['centro']['id']]['cupos'].push(val);
    });

    Object.keys(agrupCentros).forEach(key => {
      agrupCentros[key]['horario'] = this.getAMPMFromCupos(agrupCentros[key]['cupos']);
      arrCentroProfesional.push(agrupCentros[key]);
    });

    return arrCentroProfesional;

  }

  getAMPMFromCupos(cupo) {

    let horario = { am: false, pm: false };
    const cup = new Date(this.utils.toLocalScl(cupo['fechaHora'], this.compensacion, 'YYYY-MM-DDTHH:mm:ss'));
    if (cup.getHours() >= 12) {
      horario.pm = true;
    } else {
      horario.am = true;
    }

    return horario;
  }

  crearCalendario(recurso: any, min) {

    let datesDisabled = [];
    recurso['fechasDisponibles'] = {};

    try {
      this.compensacion = recurso['listaCupos'][0]['cupos'].length > 0 ? recurso['listaCupos'][0]['cupos'][0]['compensacion'] : -180;
    } catch (err) {
      this.compensacion = -180;
    }

    recurso['fechasDisponibles'] = clone(this.listaFechas);

    recurso['listaCupos'].forEach((valLc, keyLc) => {
      valLc['cupos'].forEach((val, key) => {

        let fechaEpoch = new Date(val['horaEpoch'] * 1000);
        let u: any = this.utils.toLocalScl(fechaEpoch, this.compensacion);
        u = this.utils.toStringDateJson(u);
        val['fechaHora'] = this.utils.toLocalScl(new Date(val['horaEpoch'] * 1000), val['compensacion'], 'YYYY-MM-DDTHH:mm:ss');
        val['hora'] = this.utils.toLocalScl(new Date(val['horaEpoch'] * 1000), val['compensacion'], 'HH:mm');
        val['centro'] = valLc['centro'];
        recurso['fechasDisponibles'][u['year'] + '-' + u['month'] + '-' + u['day']].push(val)

      })
    })

    recurso['datesToHighlight'] = { dates: [], displayed: false, dateClass: null };
    recurso['datesToHighlight']['displayed'] = true;
    recurso['datesToHighlight']['dates'] = datesDisabled;
    recurso['datesToHighlight']['dateClass'] = this.dateClass(recurso['fechasDisponibles']);
    recurso['hasCupoMultiple'] = this.verificarMasDeUnCentro(recurso['fechasDisponibles']);
    recurso['proximaFechaEpoch'] = recurso['proximaHoraDisponible']['cupo']['horaEpoch'];

    return recurso;

  }

  crearListaFechas() {

    const compensacion = -180;
    let fecha = new Date();
    let f;
    fecha.setDate(1);
    fecha.setMinutes(0);
    fecha.setSeconds(0);
    fecha.setHours(6);

    for (let day = 1; day <= 380; day++) {

      if (day == 1) {
        f = this.utils.toLocalScl(fecha, compensacion);
      } else {
        fecha.setDate(fecha.getDate() + 1);
        f = this.utils.toLocalScl(fecha, compensacion);
      }

      f = this.utils.toStringDateJson(f);
      this.listaFechas[f.year + '-' + f.month + '-' + f.day] = [];

    }

  }

  seleccionarHora(data) {

    this.horaSeleccionada = data;
    this.calendario.emit(data);
    gtag('event', 'Selección Cupo', { 'event_category': 'Seleccionar Hora', 'event_label': data.cupo.hora , 'value': '0' });

    gtag('config', ENV.analyticsCode, 
    {'page_path': `/busqueda/${this.busquedaInicial.tipoConsulta}/area/${this.busquedaInicial.area.id}/profesional/${data.recurso.id}servicio/${this.busquedaInicial.especialidad.idServicio}/centro/${this.busquedaInicial.centroAtencion.idCentro}/cupo` });

  }

  verPerfil(re) {
    this.utils.verPerfilProfesional(re);
  }

  async procesarListaEspera(data) {

    const bcentro = this.busquedaInicial.centroAtencion;
    const bprofe = this.busquedaInicial.profesional;
    const centroTodos = bcentro.codigo && bcentro.codigo === 'todos' ? true : false;
    const idProfesional = bprofe && bprofe.idProfesional ? bprofe.idProfesional : null;
    const reglaExclusionData = {
      idServicio: this.busquedaInicial.especialidad.idServicio,
      idProfesional: data && data.id ? data.id : idProfesional,
      idCentro: !centroTodos ? this.busquedaInicial.centroAtencion.idCentro : null
    };

    const reglaExclusion = await this.agendaService.getReglasExclusion('LE', reglaExclusionData);

    if (reglaExclusion['resultadoValidacion'] && reglaExclusion['resultadoValidacion'].toUpperCase() === 'VALIDO') {
      if (!data.id && this.busquedaInicial.profesional) {
        data = {
          id: this.busquedaInicial.profesional.idProfesional,
          nombre: this.busquedaInicial.profesional.nombreProfesional
        }
      }

      this.listaEspera.emit(data);

    } else {

      const msg = (reglaExclusion['usrMsg']) ? reglaExclusion['usrMsg'] : 'No se ha podido validar si puede incribirse a la Lista de Espera. Intente más tarde nuevamente.'
      this.utils.mDialog('Notificación', msg, 'message');
      return false;

    }


  }

  displayListaEspera(fechasDisponibles, poseeMes) {


    let display = true;

    const today = new Date(this.utils.toLocalScl(new Date(), this.compensacion, 'YYYY-MM-DDTHH:mm:ss'));
    const end = new Date(this.utils.toLocalScl(new Date(), this.compensacion, 'YYYY-MM-DDTHH:mm:ss'));

    end.setMonth(end.getMonth() + 1);

    if (today.getDate() === 31) {
      end.setMonth(end.getMonth() - 1);
    }

    end.setDate(end.getDate() - 1);

    const init = today.toISOString().split("T")[0];
    const endit = end.toISOString().split("T")[0];

    let activateInit = false;

    Object.keys(fechasDisponibles).forEach(keyDate => {

      if (keyDate === init) {
        activateInit = true;
      }

      if (keyDate === endit) {
        activateInit = false;
      }

      if (activateInit && fechasDisponibles[keyDate].length > 0) {
        display = false;
      }

    });

    return display;


  }

  async setProcedimiento() {

    const bcentro = this.busquedaInicial.centroAtencion;
    const bprofe = this.busquedaInicial.profesional;
    const centroTodos = bcentro.codigo && bcentro.codigo === 'todos' ? true : false;
    const idProfesional = bprofe && bprofe.idProfesional ? bprofe.idProfesional : null;
    const reglaExclusionData = {
      idServicio: this.busquedaInicial.especialidad.idServicio,
      idProfesional: idProfesional,
      idCentro: !centroTodos ? this.busquedaInicial.centroAtencion.idCentro : null
    };

    const reglaExclusion = await this.agendaService.getReglasExclusion('P', reglaExclusionData);

    if (reglaExclusion['resultadoValidacion'] && reglaExclusion['resultadoValidacion'].toUpperCase() === 'VALIDO') {

      this.procedimiento.emit(true);

    } else {

      const msg = (reglaExclusion['usrMsg']) ? reglaExclusion['usrMsg'] : 'No se ha podido validar si puede solicitar un Procedimiento. Intente más tarde nuevamente.'
      this.utils.mDialog('Notificación', msg, 'message');
      return false;

    }

  }


  cambiarFiltroCentro(centro) {
    this.nActivosFiltroCentro = 0;
    this.filtro = centro;
    this.filtrarBusqueda();
    gtag('event', 'Selección Cupo', { 'event_category': 'Filtrar Centro', 'event_label': centro.nombre , 'value': '0' });

  }

  filtrarCentrosAction(listaCupos) {
    let display = false;
    if (this.filtro.nombre.toLowerCase() === 'todos') {
      display = true;
      this.nActivosFiltroCentro++;
    } else {
      listaCupos.forEach((val, key) => {
        if (this.filtro.idCentro === val['centro']['id']) {
          display = true;
          this.nActivosFiltroCentro++;
        }
      });
    }
    return display;
  }

  cambiarFiltroHoras(hora) {
    this.filtroHoras = hora;
    this.nActivosFiltroHoras = 0;
    gtag('event', 'Selección Cupo', { 'event_category': 'Filtrar Horario', 'event_label': hora === 'ALL' ? 'AM/PM' : hora , 'value': '0' });
    this.filtrarBusqueda();
  }

  filtrarBusqueda() {

    return new Promise((resolve, reject) => {

      try {

        if (!this.filtro.nombre.toLowerCase().includes('todos') || this.filtroHoras !== 'ALL') {
          this.filtroAplicado = true;
        } else {
          this.filtroAplicado = false;
        }

        const store = this.setRecursosCache().getItem();
        const min: any = this.utils.trDateStr(this.navigationDate.min, null, this.compensacion);
        const max: any = this.utils.trDateStr(this.navigationDate.max, null, this.compensacion);
        const init = min.split("T")[0];
        const endit = max.split("T")[0];
        let recursos = JSON.parse(store);
        let datesToEvaluate = [];
        const dsplit = init.split("-");
        const st = Number(dsplit[2]);
        const en = Number(endit.split("-")[2]);

        for (let i = st; i <= en; i++) {
          datesToEvaluate.push(`${dsplit[0]}-${dsplit[1]}-${i < 10 ? `0${i}` : i}`);
        }

        recursos.forEach((re, key) => {

          let idCentrosDisp = {};
          let listaCupos = [];

          datesToEvaluate.forEach(keyDate => {

            let cuposHabilitados: any[] = re.fechasDisponibles[keyDate].filter(cupo => {

              const isTodos = this.filtro.nombre.toLowerCase().includes('todos') ? true : false;
              const horario = this.getAMPMFromCupos(cupo);
              let aplicaCentro = false;
              let aplicaHorario = false;


              if (isTodos || this.filtro.id === cupo.centro.id) {
                aplicaCentro = true;
              }

              if (this.filtroHoras === 'ALL' || (this.filtroHoras === 'PM' && horario.pm) || (this.filtroHoras === 'AM' && horario.am)) {
                aplicaHorario = true;
              }

              if (!idCentrosDisp[cupo.centro.id]) {
                idCentrosDisp[cupo.centro.id] = { nombre: cupo.centro.nombre, cupos: [] }
              }


              if (aplicaCentro && aplicaHorario) {
                idCentrosDisp[cupo.centro.id]['cupos'].push(cupo);
                return cupo;
              }

            });

            re.fechasDisponibles[keyDate] = cuposHabilitados;

          });

          Object.keys(idCentrosDisp).forEach(key => {
            if ((this.filtro.nombre.toLowerCase().includes('todos') || this.filtro.idCentro === key) && idCentrosDisp[key]['cupos'].length > 0) {
              listaCupos.push({
                centro: { id: key, nombre: idCentrosDisp[key]['nombre'], nombreCentro: idCentrosDisp[key]['nombre'] },
                cupos: idCentrosDisp[key]['cupos']
              });
            }
          });

          re.listaCupos = listaCupos;
          re.listaCuposMes = listaCupos;
          re.proximaFechaEpoch = this.getProximaFechaEpoch(listaCupos)
          re['datesToHighlight'] = { dates: [], displayed: false, dateClass: null };
          re['datesToHighlight']['displayed'] = true;
          re['datesToHighlight']['dateClass'] = this.dateClass(re['fechasDisponibles']);
          re['hasCupoMultiple'] = this.verificarMasDeUnCentro(re['fechasDisponibles']);
        });

        this.utils.showProgressBar();
        this.displayCalendar = false;
        this.recursos = this.orderPipe.transform(recursos, 'proximaFechaEpoch');
        this.determinarMesSinCupo();

        if(this.filtroAplicado){
          const recc = clone(this.recursos);
          this.recursos = recc.filter(item => {
            if (item.poseeMes) {
              return item;
            }
          })
        }

        setTimeout(() => {
          this.restoreCalendar();
          this.prepareTooltip();
          this.utils.hideProgressBar();
          resolve(true);
        }, 2000);

      } catch (err) {
      }
    });


  }

  getProximaFechaEpoch(listaCupos) {
    if (listaCupos.length > 0) {
      const horas = listaCupos.map(item => {
        return item.cupos[0].horaEpoch
      });
      return Math.min(horas);
    } else {
      return null;
    }


  }

  setRecursosCache() {
    return {
      setItem: (value) => {
        this.recursoCache = value;
      },
      clearItem: () => {
        this.recursoCache = null;
      },
      getItem: () => {
        return clone(this.recursoCache);
      }
    }
  }

  verificarMasDeUnCentro(fechasDisponibles) {

    let datesToEvaluate = [];
    let hasCupoMultiple = false;
    const min: any = this.utils.trDateStr(this.navigationDate.min, null, this.compensacion);
    const max: any = this.utils.trDateStr(this.navigationDate.max, null, this.compensacion);
    const init = min.split("T")[0];
    const endit = max.split("T")[0];
    const dsplit = init.split("-");
    const st = Number(dsplit[2]);
    const en = Number(endit.split("-")[2]);
    for (let i = st; i <= en; i++) {
      datesToEvaluate.push(`${dsplit[0]}-${dsplit[1]}-${i < 10 ? `0${i}` : i}`);
    }

    datesToEvaluate.forEach((val, key) => {
      if (this.getNCentros(fechasDisponibles[val]).length > 1) {
        hasCupoMultiple = true;
      }
    });

    return hasCupoMultiple;
  }
  consultarCalendario2(item){
    const search = {
      area: ENV.areaConsultaMedica.id,
      tipo: 'especialidad',
      especialidad:'b2182750-ec15-4e3a-9be1-a93400e35665',
      servicio: item.idServicioDerivado.toLowerCase(),
      centro: ENV.idRegion,
      rut: this.busquedaInicial.documentoPaciente.documento,
      tipoDocumento: 'RUN'
    }
    this.removerDerivacion = true;
    this.utils.saludIntegralVolver().setVolver('VISTA_CALENDARIO');
    this.utils.especialidadDerivaciones().setEspecialidad(search);
  }

  consultarCalendario(deriv, vista = 'VISTA_CALENDARIO'){
    
    if(!deriv.idEspecialidad){
      this.utils.mDialog("Error", "Debe elegir una especialidad.", "message");
      return;
    }

    this.utils.showProgressBar();
    this.agendaService.getEspecialidadesByGeneric(ENV.areaConsultaMedica.id, null, deriv.idServicioDerivado.toLowerCase()).subscribe(async (srvRequest: any) => {

      try {
        const idEspecialidad = deriv.idEspecialidad;

        const especialidades = srvRequest.especialidades.map( item => {
          item.id = item.idEspecialidad;
          return item;
        })

        const especialidad = especialidades.find(item => {
          return item.idEspecialidad === idEspecialidad
        });
        const servEspRequest:any = await this.agendaService.getServiciosByEspecialidad(idEspecialidad, ENV.areaConsultaMedica.id);
        const servicio = servEspRequest.servicios.find(item => {
          return item.id === deriv.idServicioDerivado.toLowerCase()
        });

        especialidad.idServicio = servicio.id;
        especialidad.nombreServicio = servicio.nombre;
        
        const profesional = deriv.profesional ?  deriv.profesional : null;
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
        const documentoPaciente = this.profesionalCabecera.documentoPaciente
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
          datosImagenes,
          fromSaludIntegral: true,
          listadoEspecialidades: this.busquedaInicial.listadoEspecialidades
        };

        console.log(busqueda)

        if(vista !== 'VISTA_DERIVACION'){
          this.removerDerivacion = true;
        }

        this.resetCalendario();
        this.utils.saludIntegralVolver().setVolver(vista);
        this.utils.especialidadDerivaciones().setEspecialidad(busqueda);

      } catch (err) {

        this.utils.mDialog("Error", "No se puede consultar el calendario de la derivación. Intente más tarde", "message");
        this.utils.hideProgressBar();

      }

    });

  }

  verAgendaDerivacion(titular = false){
    this.utils.showProgressBar();
    this.resetCalendario();
    this.especialidadSelected = null;
    const benf = titular ? this.beneficiarioTitular : this.beneficiarioSelected;
    this.isTitular = titular;
    this.utils.actionAgendaBeneficiarios().setAgenda(benf);
  }

  changeSelectEspecialidad(e, re){
    let esp = e.value;
    let profesional = null;
    esp.idServicioDerivado = esp.idServicio;
    if(re){
      profesional = {
        nombre: re.nombre || re.nombreProfesional,
        detalle: re.nombre || re.nombreProfesional,
        id: re.id,
        idProfesional : re.id
      }
    }
    esp.profesional = profesional;
    this.consultarCalendario(esp, 'VISTA_DERIVACION');
  }

}