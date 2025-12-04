package de.byedev.dsatable2.dsa_table_backend.util;

import java.awt.*;

public class SVGUtil {

    public static final String DOCTYPE = "<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n";

    public static final String SVG_OPEN = "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' " +
            " width='80.0' height='100.0'>";

    public static final String SVG_CLOSE = "</svg>";

    public static final String HEAD = "<path style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color' " +
            "d='M32.0,75.0L29.0,85.0C34.0,88.0,46.0,88.0,51.0,85.0L48.0,75.0Z'/>" +
            "<ellipse style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color' " +
            "cx='40.0' cy='50.0' rx='30.0' ry='30.0'/>";

    public static final String CLOTH = "<path style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;" +
            "stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color' " +
            "d='M16.0,88.0C8.0,92.0,4.0,96.0,0.0,100.0L78.0,100.0C74.0,96.0,74.0,88.0,62.0,88.0Z'/>\n" +
            "<ellipse cx='40.0' cy='89.0' rx='25.0' ry='5.0' style='stroke-width:2.0;stroke:rgb(0,0,0);" +
            "stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color'/>\n" +
            "<ellipse cx='40.0' cy='86.0' rx='21.0' ry='4.0' style='stroke-width:2.0;stroke:rgb(0,0,0);" +
            "stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color'/>\n";

    public static final String FACE = "<path style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;" +
            "stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color' " +
            "d='M32.0,75.0L29.0,85.0C34.0,88.0,46.0,88.0,51.0,85.0L48.0,75.0Z'/>\n" +
            "<ellipse cx='40.0' cy='50.0' rx='30.0' ry='30.0' style='stroke-width:2.0;stroke:rgb(0,0,0);" +
            "stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color'/>";

    public static final String EARS = "<ellipse cx='11.5' cy='48' rx='10' ry='10' style='stroke-width:3.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color'/>\n" +
            "<ellipse cx='68.5' cy='48' rx='10' ry='10' style='stroke-width:3.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color'/>";

    public static final String EARS_POINTY = "<path style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;" +
            "stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color' " +
            "d='M 10, 56 C 4,52 3,42 3,34 8,38 12,48 10,56 z'/>" +
            "<path style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;" +
            "stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color' " +
            "d='M 70, 56 C 76,52 77,42 77,34 72,38 68,48 70,56 z'/>";

    public static final String MOUTH_UP = "<path style='stroke-width:3.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:none' " +
            "d='M28.0,60.0C36.0,65.0,44.0,65.0,52.0,60.0'/>";

    public static final String MOUTH_STRAIGHT = "<path style='stroke-width:3.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:none' " +
            "d='M28.0,63.0L52.0,63.0'/>";

    public static final String MOUTH_DOWN = "<path style='stroke-width:3.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:none' " +
            "d='M28.0,65.0C36.0,60.0,44.0,60.0,52.0,65.0'/>";

    public static final String MOUTH_COVERED = "<path style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color' d='M29.0,80.0L12.0,65.0C18.0,59.0,28.0,54.0,37.0,52.0L45.0,52.0C53.0,55.0,60.0,61.0,67.0,66.0L50.0,80.0C42.0,81.0,38.0,81.0,29.0,80.0Z'/>";

    public static final String EYES = "<ellipse cx='28.5' cy='45.5' rx='2.5' ry='2.5' style='fill:rgb(0,0,0)'/>\n" +
            "<ellipse cx='51.5' cy='45.5' rx='2.5' ry='2.5' style='fill:rgb(0,0,0)'/>";

    public static final String EYEBROWS_STRAIGHT = "<line x1='24.0' y1='39.0' x2='33.0' y2='39.0' style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0'/>" +
            "<line x1='47.0' y1='39.0' x2='56.0' y2='39.0' style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0'/>";

    public static final String EYEBROWS_DOWN = "<line x1='24.0' y1='37.0' x2='33.0' y2='40.0' style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0'/>" +
            "<line x1='47.0' y1='40.0' x2='56.0' y2='37.0' style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0'/>";

    public static final String HAIR_SHORT_RUFFLED = "<path style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;" +
            "stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color' " +
            "d='M68.0,46.0L64.0,30.0L44.0,26.0L48.0,36.0L32.0,25.0L16.0,31.0L14.0,46.0L9.0,46.0L8.0,21.0L18.0,15.0L23.0,4.0L56.0,10.0L76.0,6.0L72.0,25.0L72.0,45.0Z'/>";

    public static final String HAIR_SHORT_CURLY = "<path style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;" +
            "stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color' " +
            "d='M 39.268,11.048 C 42.725,8.61 45.637,8.161 47.583,11.237 51.124,10.491 53.727,10.935 54.954,13.127 59.339,12.674 60.184,15.157 61.001,17.663 64.557,18.714 66.881,20.466 65.915,24.088 68.019,25.714 70.23,27.248 69.128,31.648 72.396,33.165 72.363,36.016 71.018,39.396 75.744,44.205 72.561,46.344 70.451,48.846 70.698,51.668 71.161,54.548 68.561,56.594 63.281,57.928 61.634,55.63 60.484,52.835 59.75,49.468 61.977,47.952 63.493,46.921 62.171,44.432 62.417,43.065 63.269,41.097 61.726,38.859 59.405,36.863 61.946,33.349 60.473,33.665 59.405,32.903 58.734,31.081 56.042,33.972 53.287,34.715 50.418,31.648 47.349,32.925 44.425,35.184 40.591,31.27 36.968,34.209 35.011,32.542 32.842,31.459 31.43,33.17 30.924,34.187 27.526,33.543 26.082,35.062 25.626,37.193 20.651,36.527 20.077,37.33 19.363,37.645 18.613,37.83 19.339,40.183 18.132,41.621 17.243,43.209 17.801,44.938 19.523,46.223 18.412,48.587 13.984,52.488 13.3,51.227 11.096,51.193 5.524,48.017 8.165,45.371 9.125,43.008 8.276,40.296 6.887,37.564 10.762,35.023 10.749,32.063 11.336,29.454 14.938,28.609 13.483,24.122 16.05,22.836 18.88,21.76 18.955,18.876 20.935,17.297 24.125,16.548 25.543,14.346 27.344,12.554 31.141,12.907 32.73,10.935 35.105,9.912 39.268,11.048 Z'/>";

    public static final String HAIR_UNDERCUT = "<path style='fill:$color;fill-opacity:1;stroke:#000000;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' " +
            "d='M 17.101,27.954 C 27.432,13.15 50.615,13.213 62.836,27.009 55.051,30.633 47.44,33.206 40.158,33.813 30.74,33.592 24.099,30.595 17.101,27.954 Z'/>";

    public static final String HAIR_TOMAHAWK = "<rect style='opacity:1;fill:$color;fill-opacity:1;stroke:#000000;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' id='rect859' " +
            "width='14' height='28' x='33' y='2'/>" +
            "<rect style='opacity:1;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:3.06500006;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' id='rect861' " +
            "width='1' height='10' x='25' y='23' transform='rotate(-40,25,28)'/>" +
            "<rect style='opacity:1;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:3.06500006;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' id='rect861-5' " +
            "width='1' height='6' x='16' y='31' transform='rotate(-60,16,34)'/>" +
            "<rect style='opacity:1;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:3.06500006;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' id='rect861-0' " +
            "width='1' height='10' x='55' y='23' transform='rotate(40,55,28)'/>" +
            "<rect style='opacity:1;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:3.06500006;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' id='rect861-5-2' " +
            "width='1' height='6' x='64' y='31' transform='rotate(60,64,34)'/>";

    public static final String HAIR_LONG = "<path style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color' d='M8.0,88.0C12.0,68.0,12.0,72.0,8.0,60.0C8.0,48.0,4.0,36.0,8.0,28.0C12.0,20.0,17.0,2.0,44.0,2.0C60.0,2.0,68.0,8.0,76.0,16.0C80.0,20.0,80.0,52.0,76.0,72.0C72.0,80.0,72.0,84.0,64.0,88.0C68.0,76.0,68.0,64.0,68.0,44.0C65.0,29.0,56.0,28.0,44.0,24.0C28.0,24.0,20.0,28.0,16.0,36.0C16.0,48.0,24.0,84.0,8.0,88.0Z'/>";

    public static final String HAIR_LONG_BACK = "<rect x='13.0' y='40.0' width='54.0' height='44.0' style='stroke-width:2.0;stroke:rgb(0,0,0);stroke-opacity:1.0;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10.0;fill:$color'/>";

    public static final String WEAPON_SWORD = "<path style='fill:#909090;fill-opacity:1;stroke:#000000;stroke-width:0.55217403;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' " +
            "d='M 16.024,76.294 32.835,98.194 37.296,94.97 21.931,71.873 Z' id='swordblade'/>" +
            "<path style='fill:#2c2c2c;fill-opacity:1;stroke:#000000;stroke-width:2;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' " +
            "d='M 2,52 C 1,56 2,56 12,70 6,76 0,77 2,80 4,85 8,82 16,76 21,80 16,73 24,77 19,70 22,76 22,72 31,65 32,64 36,58 29,58 26,59 18,65 7,52 4,50 2,52 Z' id='swordhilt' />";
    public static final String WEAPON_AXE = "<path style='fill:#5b5f5a;fill-opacity:1;stroke:#000000;stroke-width:2;stroke-linecap:square;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' " +
            "d='M 40,65 49,50 C 62,50 72,42 80,34 73,67 66,79 47,97 48,80 52,72 40,65 Z' id='axeblade'/>" +
            "<path style='fill:#b75f00;fill-opacity:1;stroke:#000000;stroke-width:2;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' " +
            "d='M 12,100 44,48 49,50 17,100 Z' id='axehilt'/>";
    public static final String WEAPON_BOW = "<path style='fill:#784100;fill-opacity:1;stroke:#000000;stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1' " +
            "d='M 34.132,108.41 78.715,39.273 C 78.905,71.949 89.411,111.194 35.097,109.165 97.505,102.337 67.981,63.759 78.715,39.084' id='bow'/>";

    public static final String SHOULDER_PADS = "<path style='fill:$color;fill-opacity:1;stroke:#000000;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' " +
            "d='M -0.032,103.728 C -0.011,99.472 0.909,95.663 4.06,90.529 8.108,88.706 10.303,87.496 15.057,87.352 14.679,91.185 15.571,94.852 12.497,98.247 8.649,100.976 4.226,102.126 -0.032,103.728 Z'/>" +
            "<path style='fill:$color;fill-opacity:1;stroke:#000000;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' " +
            "d='M 79.672,103.889 C 79.653,99.633 78.816,95.824 75.952,90.69 72.272,88.867 70.277,87.657 65.955,87.513 66.299,91.346 65.488,95.013 68.282,98.408 71.78,101.137 75.801,102.288 79.672,103.889 Z'/>";

    public static final String VISOR = "<path style='fill:$color;fill-opacity:1;stroke:#000000;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' " +
            "d='M 34.8,19 36.8,37.0 H 41.2 L 43.9,19 C 41.2,19.0 38.2,19 34.8,19.0 Z'/>" +
            "<path style='fill:$color;fill-opacity:1;stroke:#000000;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' " +
            "d='M 10.406,37.252 H 69.0 C 70.537,42.761 71.438,49.076 70.798,55.229 L 9.045,55.505 C 8.651,49.513 8.652,43.244 10.406,37.252 Z'/>";

    public static final String VISOR_OPENING = "<rect style='opacity:1;fill:$color;fill-opacity:1;stroke:#000000;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1' id='rect861-5-2' " +
            "width='48' height='6' x='16' y='42.5'/>";

    public static String getSvg(String svg, Color color) {
        return getSvg(svg,toHex(color));
    }

    public static String getSvg(String svg, String color) {
        return svg.replace("$color", color);
    }

    public static String toHex(Color c) {
        return String.format("#%02x%02x%02x", c.getRed(), c.getGreen(), c.getBlue());
    }
}
