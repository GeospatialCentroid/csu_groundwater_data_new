

//
var map_manager;
var map_layer;
var layer_manager;
var table_manager;
var click_marker;
var side_by_side_control
var layer_rects=[]

var image_manager

var field_data_post_url// from the app.csv

var transcription
var transcription_mode =true;

var params={}
var last_params={}
var usp={};// the url params object to be populated
var browser_control=false; //flag for auto selecting to prevent repeat cals


function setup_params(){
     usp = new URLSearchParams(window.location.search.substring(1).replaceAll("~", "'").replaceAll("+", " "))

    if (window.location.search.substring(1)!="" && $.isEmptyObject(params)){
       if (usp.get('e')!=null){
            params['e'] =  rison.decode(usp.get('e'))
        }
        //support passing contentdm id
        if (usp.get('id')!=null){
            params['id'] =  usp.get('id')
        }
        if (usp.get('t')!=null){
           console.log("transcription mode")
           transcription_mode=true;
        }
        // debug mode
        if (usp.get('d')!=null){
           DEBUGMODE=true
        }
    }
}
$( function() {

    $.getJSON('i18n/en.json', function(data){
            LANG=data
            initialize_interface()
    });


});

function initialize_interface() {

    var sort_str=""
    if(!$.isEmptyObject(usp) && usp.get("sort")){
        sort_str=usp.get("sort")
    }

    $("[for='filter_bounds_checkbox']").text(LANG.SEARCH.LIMIT)
    $("#filter_date_to").text(LANG.SEARCH.TO)
    $("[for='filter_date_checkbox']").text(LANG.SEARCH.LIMIT_DATE)

    $("#radio_data_label").text(LANG.SEARCH.RADIO_DATA_LABEL)

    $("#radio_place_label").text(LANG.SEARCH.RADIO_PLACE_LABEL)

    setup_params()

    map_manager = new Map_Manager(
     {params:params['e'] ,
        lat:40.111,
        lng: -104.1378635,
        z:7
        })
      table_manager = new Table_Manager({
        elm_wrap:"data_table_wrapper",
          elm:"data_table"})

    map_manager.init()

   transcription = new Transcription({ })
     // allow for iiif viewing
     image_manager=new Image_Manager({})
     image_manager.init()

     if(params['id']){
        //todo need to capture the variable
       //image_manager.show_image(iiif_base_url+params['id']+"/info.json","")
     }

     layer_manager = new Layer_Manager({
        map:map_manager.map,
        layers_list:params['l'],
        service_method:services//loaded in html

      })

      layer_manager.add_basemap_control()


    section_manager=new Section_Manager({config:"app.csv",map_manager:map_manager})
    filter_manager = new Filter_Manager({
        section_manager:section_manager,
        place_url:'https://nominatim.openstreetmap.org/search?format=json',
    });
    section_manager.init();

}
function after_filters(){


}




function save_marker_data(_data){
    map_manager.data = $.csv.toObjects(_data);
    check_all_loaded();
}


function save_params(){
    var p = "?"
    +"e="+rison.encode(map_manager.params)
    if(JSON.stringify(p) != JSON.stringify(last_params) && !browser_control){
       window.history.pushState(p, null, window.location.pathname+p.replaceAll(" ", "+").replaceAll("'", "~"))
        last_params = p
    }
}


load_annotation_geojson= function(url,extra){
    $.ajax({
        type: "GET",
        url: url,
        dataType: "json",
        extra:extra,
        success: function(json) {
         parse_annotation(json,extra);
         }
     });
}
parse_annotation= function(json,extra){
        console.log("parse_annotation")
         var rect = L.geoJson(json, {pane: 'left',color: 'blue'})//todo get this from app.csv
         rect.title=extra["title"]
         rect.tms=extra["tms"]
         rect['annotation_url']=extra['annotation_url']
         rect.toggle="show"
         rect.addTo(map_manager.map);
         layer_rects.push(rect)
         rect.id=layer_rects.length-1
         rect.on('click', function () {
            toggle_layer(this.id)
            this.off('click')
         });
}

update_layer_list=function(){
    var html=""
    var map_bounds=map_manager.map.getBounds()
    for(var i =0;i<layer_rects.length;i++){
        if(map_bounds.intersects(layer_rects[i].getBounds())){
            html+=layer_rects[i].title+" <a id='layer_but_"+i+"' href='#' onclick='toggle_layer("+i+");'>"+layer_rects[i].toggle+"</a><br/>"

        }

    }
    $("#layer_list").html(html)
}
toggle_layer = function(id){
    var layer = layer_rects[id]
    if(layer.toggle=="show"){
        layer.toggle="hide"
        layer.map_layer =new Allmaps.WarpedMapLayer(layer['annotation_url'],{pane: 'right'})
        map_manager.map.addLayer(layer.map_layer)
        // we need to make sure a layer exist first before side to side control can function
        if(!side_by_side_control){
        console.log("side by side")
            side_by_side_control = L.control.sideBySide(layer.map_layer, []).addTo(map_manager.map);
        }
     }else{
        map_manager.map.removeLayer(layer.map_layer)
        layer.on('click', function () {
            toggle_layer(this.id)
            this.off('click')
         });
        layer.toggle="show"
     }
     $("#layer_but_"+id).html(layer.toggle)

}


function connect_transcription(_data){
     var data = $.csv.toObjects(_data);
     for(var i=0;i<data.length;i++){
            console.log(data[i])
     }
}


function copyElementToClipboard(element) {
  window.getSelection().removeAllRanges();
  let range = document.createRange();
  range.selectNode(typeof element === 'string' ? document.getElementById(element) : element);
  window.getSelection().addRange(range);
  document.execCommand('copy');
  window.getSelection().removeAllRanges();
}

function run_resize(){
    $( window ).resize( window_resize);
    setTimeout(function(){
             $( window ).trigger("resize");

             // leave on the dynamic links - turn off the hrefs
             $("#browse_panel .card-body a").attr('href', "javascript: void(0)");

             // rely on scroll advance for results
             $("#next_link").hide();


            // update paging
//            filter_manager.update_parent_toggle_buttons(".content_right")
//            filter_manager.update_parent_toggle_buttons("#details_panel")
//            filter_manager.update_toggle_button()
            if(! DEBUGMODE){
                $("#document .page_nav").hide()
            }else{
                //append d=1, so that debug mode remains
                $("#document .page_nav a").each(function() {
                   $(this).attr("href",  $(this).attr("href") + '&d=1');
                });
            }
            $("#content").show();
           map_manager.map.invalidateSize()

           image_manager.image_map.invalidateSize()
    },100)
        //update the height of the results area when a change occurs
//        $('#side_header').bind('resize', function(){
//
//    });

}
function window_resize() {
        var data_table_height=0
         if( $("#data_table_wrapper").is(":visible")){
           data_table_height= $("#data_table_wrapper").height()
        }
        var header_height=$("#header").outerHeight()+20;
        var footer_height=15//$("#footer").height()
        var window_height= $(window).outerHeight()
        var window_width= $(window).width()
        var minus_height=header_height+footer_height
        console.log("CONTENT HEIGHT",window_height,minus_height,header_height,footer_height)
       $("#content").height(window_height-minus_height)

       $("#map_wrapper").height(window_height-minus_height-data_table_height)
       var scroll_height=window_height-minus_height-$("#side_header").outerHeight()
       //-$("#tabs").outerHeight()-$("#nav_wrapper").outerHeight()
       $("#panels").height(scroll_height)
       $(".panel").height(scroll_height)

//        $("#map_panel_wrapper").height(window_height-$("#tabs").height()-minus_height)
//        $("#map_panel_scroll").height(window_height-$("#tabs").height()-minus_height)

            //
//       $("#tab_panels").css({'top' : ($("#tabs").height()+header_height) + 'px'});

//       .col-xs-: Phones (<768px)
//        .col-sm-: Tablets (≥768px)
//        .col-md-: Desktops (≥992px)
//        .col-lg-: Desktops (≥1200px)


       if (window_width >768){

            // hide the scroll bars
            $('html, body').css({
                overflow: 'hidden',
                height: '100%'
            });
            $("#map_wrapper").width(window_width-$("#side_bar").width()-1)
            $("#data_table_wrapper").width(window_width-$("#side_bar").width()-1)

            map_manager.map.scrollWheelZoom.enable();
       }else{
             //mobile view

             // scroll as needed
             $('html, body').css({
                overflow: 'auto',
                height: 'auto'
            });

            // drop the map down for mobile
            $("#map_wrapper").width(window_width)
            $("#data_table_wrapper").width(window_width)

            map_manager.map.scrollWheelZoom.disable();
       }
        //final sets
        $("#panels").width($("#side_bar").width())
        $(".panel").width($("#side_bar").width())
        if(map_manager){
            map_manager.map.invalidateSize()
        }
        // slide to position
         $("#panels").stop(true, true)
         // if we are on the search tab, make sure the viewable panel stays when adjusted
        if("search_tab"==$("#tabs").find(".active").attr("id")){
            section_manager.slide_position(section_manager.panel_name)
        }

        $("#result_wrapper").css({"height":scroll_height-$("#filter_area").height()})

 }