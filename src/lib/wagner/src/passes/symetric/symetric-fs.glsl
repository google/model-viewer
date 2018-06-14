varying vec2 vUv;
uniform sampler2D tInput;
uniform float xReverse;
uniform float yReverse;
uniform float xMirror;
uniform float yMirror;
uniform float angle;
uniform vec2 mirrorCenter;
vec2 nvUv;

void main() {

    nvUv = vUv;

    if (xReverse == 1.) {

        nvUv.x = (1.0 - vUv.x );

        if(xMirror == 1.) {

            if(vUv.x < 0.5) {
                nvUv.x = 1.0 - (nvUv.x) - (0.5 - mirrorCenter.x ) ;
            }
            else {
                nvUv.x = nvUv.x - (0.5 - mirrorCenter.x);
            }
        }
    }

    else if(xMirror == 1.) {

        if(vUv.x < 0.5) {
            nvUv.x = 1.0 - (nvUv.x) - (0.5 - mirrorCenter.x ) ;
        }
        else {
            nvUv.x = nvUv.x - (0.5 - mirrorCenter.x);
        }
    }

    if (yReverse == 1.) {

        nvUv.y = (1.0 - vUv.y );

        if(yMirror == 1.) {
            if(vUv.y < 0.5) {
                nvUv.y = 1.0 - (nvUv.y) - (0.5 - mirrorCenter.y ) ;
            }
            else {
                nvUv.y = nvUv.y - (0.5 - mirrorCenter.y);
            }
        }
    }

    else if(yMirror == 1.) {

        if(vUv.y < 0.5) {
            nvUv.y = 1.0 - (nvUv.y) - (0.5 - mirrorCenter.y ) ;
        }
        else {
            nvUv.y = nvUv.y - (0.5 - mirrorCenter.y);
        }
    }


    float sin_factor = sin(angle);
    float cos_factor = cos(angle);
    vec2 origin = vec2(0.5 ,0.5);
    
    vec2 temp = (nvUv - origin);

    temp = temp * mat2(cos_factor, sin_factor, -sin_factor, cos_factor);

    nvUv = (temp + origin);

	gl_FragColor = texture2D( tInput, nvUv );
	gl_FragColor.rgb = gl_FragColor.rgb;
}