/* =========================================================
   JavaScript halaman cetak laporan.
   Mengisi data dari parameter URL + data.js, lalu membuka
   dialog cetak browser.
   ========================================================= */
(function () {
  'use strict';

  function $(sel) { return document.querySelector(sel); }
  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
    return null;
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var params = new URLSearchParams(window.location.search);
  var page = document.body.getAttribute('data-page');

  function tanggalPanjang(iso) {
    var d = new Date(iso + 'T00:00:00');
    return HARI[d.getDay()] + ', ' + pad(d.getDate()) + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();
  }

  function isiTtd() {
    var el = $('#Doniza_ttdTanggal');
    if (!el) return;
    var n = new Date();
    el.textContent = 'Tasikmalaya, ' + pad(n.getDate()) + ' ' + BULAN[n.getMonth()] + ' ' + n.getFullYear();
  }

  function cariSiswa(nis) {
    for (var i = 0; i < SISWA.length; i++) if (SISWA[i].nis === nis) return SISWA[i];
    return null;
  }

  function isiInfoSiswa(s) {
    var kls = byId(KELAS, s.kelas);
    var jur = byId(JURUSAN, s.jurusan);
    $('#Doniza_pNis').textContent = s.nis;
    $('#Doniza_pNama').textContent = s.nama;
    $('#Doniza_pKelas').textContent = kls ? kls.nama : '-';
    $('#Doniza_pJurusan').textContent = jur ? jur.nama : '-';
    if ($('#Doniza_pJk')) $('#Doniza_pJk').textContent = s.jk;
  }

  function tidakDitemukan(kolom) {
    $('#Doniza_tbodyData').innerHTML = '<tr><td colspan="' + kolom + '" class="Doniza_kosong">Data siswa tidak ditemukan.</td></tr>';
  }

  /* ---------- Cetak data siswa ---------- */
  function initPrintSiswa() {
    var jur = params.get('id_jurusan') || '';
    var rows = document.querySelectorAll('#Doniza_tbodyData tr[data-jurusan]');
    var n = 0;
    rows.forEach(function (tr) {
      var tampil = !jur || tr.getAttribute('data-jurusan') === jur;
      tr.hidden = !tampil;
      if (tampil) { n++; tr.cells[0].textContent = n; }
    });
    var judul = 'Laporan Data Siswa Aktif';
    var j = jur ? byId(JURUSAN, jur) : null;
    if (j) judul += ' - Jurusan ' + j.nama;
    $('#Doniza_judulLaporan').textContent = judul;
    if (n === 0) {
      $('#Doniza_tbodyData').insertAdjacentHTML('beforeend', '<tr><td colspan="6" class="Doniza_kosong">Tidak ada data siswa untuk jurusan ini.</td></tr>');
    }
  }

  /* ---------- Cetak absensi ---------- */
  function periodeTanggal(iso) {
    var y = +iso.slice(0, 4);
    var m = +iso.slice(5, 7);
    var ganjil = m >= 7;
    var ta = ganjil ? y + '/' + (y + 1) : (y - 1) + '/' + y;
    return { semester: ganjil ? 'ganjil' : 'genap', ta: ta };
  }

  function initPrintAbsensi() {
    var s = cariSiswa(params.get('nis') || '');
    var smt = params.get('semester') || 'ganjil';
    var ta = params.get('ta') || '';
    $('#Doniza_pPeriode').textContent = 'Semester ' + smt.charAt(0).toUpperCase() + smt.slice(1) + ' TA ' + ta;
    if (!s) { tidakDitemukan(3); return; }
    isiInfoSiswa(s);

    var rec = ABSENSI[s.nis] || '';
    var hitung = { H: 0, S: 0, I: 0, A: 0 };
    var html = '';
    var no = 0;
    TANGGAL.forEach(function (iso, i) {
      var p = periodeTanggal(iso);
      if (p.semester !== smt || p.ta !== ta) return;
      var kode = rec.charAt(i) || 'H';
      hitung[kode]++;
      no++;
      var label = {
        H: 'Hadir',
        S: '<span style="color:#b45309;">Sakit</span>',
        I: '<span style="color:#1d4ed8;">Izin</span>',
        A: '<span style="color:#dc2626;">Alpa (Tanpa Keterangan)</span>'
      }[kode];
      html += '<tr><td class="Doniza_text_center">' + no + '</td><td>' + esc(tanggalPanjang(iso)) +
        '</td><td class="Doniza_text_center"><span style="font-weight:bold;">' + label + '</span></td></tr>';
    });
    if (!no) html = '<tr><td colspan="3" class="Doniza_kosong">Belum ada rekaman riwayat absensi untuk siswa ini.</td></tr>';
    $('#Doniza_tbodyData').innerHTML = html;
    $('#Doniza_tHadir').textContent = hitung.H;
    $('#Doniza_tSakit').textContent = hitung.S;
    $('#Doniza_tIzin').textContent = hitung.I;
    $('#Doniza_tAlpa').textContent = hitung.A;
  }

  /* ---------- Cetak nilai ---------- */
  function predikat(n) {
    if (n >= 88) return 'A (Sangat Baik)';
    if (n >= 78) return 'B (Baik)';
    if (n >= 65) return 'C (Cukup)';
    return 'D (Kurang)';
  }
  function predikatSingkat(n) {
    if (n >= 88) return 'Sangat Baik';
    if (n >= 78) return 'Baik';
    if (n >= 65) return 'Cukup';
    return 'Kurang';
  }

  function initPrintNilai() {
    var s = cariSiswa(params.get('nis') || '');
    var smt = params.get('semester') || 'semua';
    var ta = params.get('ta') || '';
    var semua = smt === 'semua';
    var kolomSmt = semua ? 1 : 0;

    $('#Doniza_pPeriode').textContent = semua
      ? 'Semua Semester (Transkrip Kumulatif)'
      : 'Semester ' + smt.charAt(0).toUpperCase() + smt.slice(1) + ' TA ' + ta;

    // Header tabel mengikuti cakupan semester
    $('#Doniza_theadData').innerHTML =
      '<tr><th width="5%" class="Doniza_text_center">No</th>' +
      (semua ? '<th width="20%" class="Doniza_text_center">Semester</th>' : '') +
      '<th>Mata Pelajaran</th><th width="15%" class="Doniza_text_center">Nilai Angka</th>' +
      '<th width="20%" class="Doniza_text_center">Predikat / Keterangan</th></tr>';

    if (!s) { tidakDitemukan(4 + kolomSmt); return; }
    isiInfoSiswa(s);

    var data = NILAI.filter(function (r) {
      if (r[0] !== s.nis) return false;
      if (semua) return true;
      var teks = r[2].toLowerCase();
      return teks.indexOf(ta) === 0 && teks.indexOf(smt) > -1;
    }).map(function (r) {
      var mp = byId(MAPEL, r[1]);
      return { semester: r[2], mapel: mp ? mp.nama : '-', rata: Math.round(((r[3] + r[4] + r[5]) / 3) * 100) / 100 };
    }).sort(function (a, b) {
      return a.semester === b.semester ? a.mapel.localeCompare(b.mapel) : a.semester.localeCompare(b.semester);
    });

    var html = '';
    var total = 0;
    data.forEach(function (r, i) {
      total += r.rata;
      html += '<tr><td class="Doniza_text_center">' + (i + 1) + '</td>' +
        (semua ? '<td class="Doniza_text_center">' + esc(r.semester) + '</td>' : '') +
        '<td>' + esc(r.mapel) + '</td>' +
        '<td class="Doniza_text_center" style="font-weight:bold;">' + r.rata + '</td>' +
        '<td class="Doniza_text_center">' + predikat(r.rata) + '</td></tr>';
    });

    if (data.length) {
      var rataAkhir = Math.round((total / data.length) * 100) / 100;
      html += '<tr class="Doniza_total_row"><td colspan="' + (2 + kolomSmt) + '" style="text-align:right;padding-right:15px;">Rata-Rata Total :</td>' +
        '<td class="Doniza_text_center" style="font-size:13px;color:#1877f2;">' + rataAkhir + '</td>' +
        '<td class="Doniza_text_center">' + predikatSingkat(rataAkhir) + '</td></tr>';
    } else {
      html = '<tr><td colspan="' + (4 + kolomSmt) + '" class="Doniza_kosong">Data komponen nilai raport siswa belum terekam pada periode ini.</td></tr>';
    }
    $('#Doniza_tbodyData').innerHTML = html;
  }

  /* ---------- Jalankan ---------- */
  var routes = {
    print_siswa: initPrintSiswa,
    print_absensi: initPrintAbsensi,
    print_nilai: initPrintNilai
  };
  if (routes[page]) routes[page]();
  isiTtd();

  var btnCetak = $('#Doniza_btnCetakUlang');
  if (btnCetak) btnCetak.addEventListener('click', function () { window.print(); });
  var btnTutup = $('#Doniza_btnTutup');
  if (btnTutup) btnTutup.addEventListener('click', function () { window.close(); });

  // Buka dialog cetak otomatis setelah halaman siap
  window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });
})();
