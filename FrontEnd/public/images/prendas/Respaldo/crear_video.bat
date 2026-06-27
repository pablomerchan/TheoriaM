@echo off
REM Crear video con 15 imágenes numeradas y tamaño uniforme (MP4)

ffmpeg -loop 1 -t 4 -i 1.png -loop 1 -t 4 -i 2.png -loop 1 -t 4 -i 3.png -loop 1 -t 4 -i 4.png -loop 1 -t 4 -i 5.png -loop 1 -t 4 -i 6.png -loop 1 -t 4 -i 7.png -loop 1 -t 4 -i 8.png -loop 1 -t 4 -i 9.png -loop 1 -t 4 -i 10.png -loop 1 -t 4 -i 11.png -loop 1 -t 4 -i 12.png -loop 1 -t 4 -i 13.png -loop 1 -t 4 -i 14.png -loop 1 -t 4 -i 15.png -filter_complex "[0:v]scale=246:368[v0];[1:v]scale=246:368[v1];[2:v]scale=246:368[v2];[3:v]scale=246:368[v3];[4:v]scale=246:368[v4];[5:v]scale=246:368[v5];[6:v]scale=246:368[v6];[7:v]scale=246:368[v7];[8:v]scale=246:368[v8];[9:v]scale=246:368[v9];[10:v]scale=246:368[v10];[11:v]scale=246:368[v11];[12:v]scale=246:368[v12];[13:v]scale=246:368[v13];[14:v]scale=246:368[v14];[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11][v12][v13][v14]concat=n=15:v=1:a=0[outv]" -map "[outv]" -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p video_prendas_60.mp4

echo Video creado: video_prendas_60.mp4
pause


@echo off
REM Crear video con 15 imágenes numeradas y exportar a WebM

ffmpeg -loop 1 -t 4 -i 1.png -loop 1 -t 4 -i 2.png -loop 1 -t 4 -i 3.png -loop 1 -t 4 -i 4.png -loop 1 -t 4 -i 5.png -loop 1 -t 4 -i 6.png -loop 1 -t 4 -i 7.png -loop 1 -t 4 -i 8.png -loop 1 -t 4 -i 9.png -loop 1 -t 4 -i 10.png -loop 1 -t 4 -i 11.png -loop 1 -t 4 -i 12.png -loop 1 -t 4 -i 13.png -loop 1 -t 4 -i 14.png -loop 1 -t 4 -i 15.png -filter_complex "[0:v]scale=246:368[v0];[1:v]scale=246:368[v1];[2:v]scale=246:368[v2];[3:v]scale=246:368[v3];[4:v]scale=246:368[v4];[5:v]scale=246:368[v5];[6:v]scale=246:368[v6];[7:v]scale=246:368[v7];[8:v]scale=246:368[v8];[9:v]scale=246:368[v9];[10:v]scale=246:368[v10];[11:v]scale=246:368[v11];[12:v]scale=246:368[v12];[13:v]scale=246:368[v13];[14:v]scale=246:368[v14];[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11][v12][v13][v14]concat=n=15:v=1:a=0[outv]" -map "[outv]" -c:v libvpx-vp9 -b:v 1M -c:a libopus video_prendas_60.webm

echo Video creado: video_prendas_60.webm
pause
