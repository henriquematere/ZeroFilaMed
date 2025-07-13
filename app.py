from flask import Flask, render_template, jsonify, request
import sqlite3
from datetime import datetime, timedelta
from collections import Counter, defaultdict

app = Flask(__name__)

DB_FILE = "zerofilamed.db"

dias_semana_pt = {
    "Mon": "Segunda-feira",
    "Tue": "Terça-feira",
    "Wed": "Quarta-feira",
    "Thu": "Quinta-feira",
    "Fri": "Sexta-feira",
    "Sat": "Sábado",
    "Sun": "Domingo"
}
meses_pt = {
    "Jan": "Janeiro",
    "Feb": "Fevereiro",
    "Mar": "Março",
    "Apr": "Abril",
    "May": "Maio",
    "Jun": "Junho",
    "Jul": "Julho",
    "Aug": "Agosto",
    "Sep": "Setembro",
    "Oct": "Outubro",
    "Nov": "Novembro",
    "Dec": "Dezembro"
}

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/dashboard-data")
def dashboard_data():
    periodo = request.args.get('periodo', '12h')
    conn = get_db_connection()
    now = datetime.now()

    # Configuração para "tempo real" (ex: últimos 60 minutos)
    intervalo_minutos = 60
    agora = datetime.now()
    inicio_tempo_real = agora - timedelta(minutes=intervalo_minutos)

    # Períodos para os gráficos/recortes
    if periodo == '12h':
        inicio = now - timedelta(hours=12)
        label_format = "%H:%M"
        num_pontos = 6
        delta = timedelta(hours=2)
    elif periodo == '24h':
        inicio = now - timedelta(hours=24)
        label_format = "%H:%M"
        num_pontos = 8
        delta = timedelta(hours=3)
    elif periodo == 'semana':
        inicio = now - timedelta(days=7)
        label_format = "%a"
        num_pontos = 7
        delta = timedelta(days=1)
    elif periodo == 'mes':
        inicio = now - timedelta(days=28)
        label_format = "%d/%m"
        num_pontos = 4
        delta = timedelta(days=7)
    elif periodo == '3m':
        inicio = now - timedelta(days=90)
        label_format = "%b"
        num_pontos = 3
        delta = timedelta(days=30)
    elif periodo == '6m':
        inicio = now - timedelta(days=180)
        label_format = "%b"
        num_pontos = 6
        delta = timedelta(days=30)
    elif periodo == 'ano':
        inicio = now - timedelta(days=365)
        label_format = "%b"
        num_pontos = 12
        delta = timedelta(days=30)
    else:
        inicio = now - timedelta(hours=12)
        label_format = "%H:%M"
        num_pontos = 6
        delta = timedelta(hours=2)

    # Labels adaptados
    buckets = []
    bucket_labels = []
    dt = inicio
    for i in range(num_pontos):
        if periodo == 'semana':
            label = dias_semana_pt.get((dt + i*delta).strftime("%a"), (dt + i*delta).strftime("%a"))
        elif periodo == 'mes':
            bucket_start = (dt + i*delta)
            bucket_end = bucket_start + delta - timedelta(days=1)
            label = f"{bucket_start.strftime('%d/%m')}-{bucket_end.strftime('%d/%m')}"
        elif periodo in ['3m', '6m', 'ano']:
            label = meses_pt.get((dt + i*delta).strftime("%b"), (dt + i*delta).strftime("%b"))
        else:
            label = (dt + i*delta).strftime(label_format)
        bucket_labels.append(label)
        buckets.append([])

    # Atendimentos do período selecionado
    cur = conn.execute("""
        SELECT id, data_atendimento
        FROM atendimento
        WHERE data_atendimento >= ?
        ORDER BY data_atendimento ASC
    """, (inicio,))
    atendimentos = cur.fetchall()
    atendimento_ids = [at['id'] for at in atendimentos]
    for at in atendimentos:
        data = datetime.fromisoformat(at['data_atendimento'])
        for i in range(num_pontos):
            bucket_start = inicio + i*delta
            bucket_end = bucket_start + delta
            if bucket_start <= data < bucket_end:
                buckets[i].append(at)
                break

    atendimentosGrafico = [len(bucket) for bucket in buckets]
    totalAtendimentos = sum(atendimentosGrafico)

    # Busca todos os tempos de processo do período
    cur = conn.execute("""
        SELECT tp.atendimento_id, tp.tipo_processo, tp.data_hora
        FROM tempo_processo tp
        JOIN atendimento a ON tp.atendimento_id = a.id
        WHERE a.data_atendimento >= ?
    """, (inicio,))
    tempos = cur.fetchall()

    tempos_dict = defaultdict(dict)
    for row in tempos:
        tempos_dict[row['atendimento_id']][row['tipo_processo']] = row['data_hora']

    # Tempo médio de espera e consulta (do filtro)
    tempos_espera = []
    tempos_consulta = []
    for at in atendimentos:
        t = tempos_dict.get(at['id'], {})
        if t.get("RETIRADA_SENHA") and t.get("INICIO_MEDICO"):
            dt_ret = datetime.fromisoformat(t["RETIRADA_SENHA"])
            dt_ini = datetime.fromisoformat(t["INICIO_MEDICO"])
            tempo = (dt_ini - dt_ret).total_seconds() / 60
            if tempo > 0:
                tempos_espera.append(tempo)
        if t.get("INICIO_MEDICO") and t.get("FIM_MEDICO"):
            dt_ini = datetime.fromisoformat(t["INICIO_MEDICO"])
            dt_fim = datetime.fromisoformat(t["FIM_MEDICO"])
            tempo = (dt_fim - dt_ini).total_seconds() / 60
            if tempo > 0:
                tempos_consulta.append(tempo)
    tempoMedioEsperaFiltro = int(sum(tempos_espera) / len(tempos_espera)) if tempos_espera else 0

    # Tempo médio de espera por bucket
    tempoMedioGrafico = []
    for bucket in buckets:
        tempos = []
        for at in bucket:
            t = tempos_dict.get(at['id'], {})
            if t.get("RETIRADA_SENHA") and t.get("INICIO_MEDICO"):
                dt_ret = datetime.fromisoformat(t["RETIRADA_SENHA"])
                dt_ini = datetime.fromisoformat(t["INICIO_MEDICO"])
                tempo = (dt_ini - dt_ret).total_seconds() / 60
                if tempo > 0:
                    tempos.append(tempo)
        tempoMedioGrafico.append(int(sum(tempos)/len(tempos)) if tempos else 0)

    # --- TEMPO REAL (pessoas aguardando e tempo médio de espera, últimos 60min) ---
    # Pessoas aguardando (última hora)
    cur = conn.execute("""
        SELECT atendimento_id, tipo_processo
        FROM tempo_processo
        WHERE tipo_processo IN ('RETIRADA_SENHA', 'INICIO_MEDICO')
          AND atendimento_id IN (
              SELECT id FROM atendimento WHERE data_atendimento >= ?
          )
    """, (inicio_tempo_real,))
    processos = cur.fetchall()
    retiraram_senha = set()
    iniciaram_medico = set()
    for row in processos:
        if row["tipo_processo"] == "RETIRADA_SENHA":
            retiraram_senha.add(row["atendimento_id"])
        elif row["tipo_processo"] == "INICIO_MEDICO":
            iniciaram_medico.add(row["atendimento_id"])
    aguardando = retiraram_senha - iniciaram_medico
    pessoasAguardando = len(aguardando)

    # Tempo médio de espera real (última hora, só para atendimentos finalizados)
    cur = conn.execute("""
        SELECT t.atendimento_id, t.data_hora as retirada, m.data_hora as inicio_medico
        FROM tempo_processo t
        JOIN atendimento a ON t.atendimento_id = a.id
        LEFT JOIN tempo_processo m ON m.atendimento_id = t.atendimento_id AND m.tipo_processo = 'INICIO_MEDICO'
        WHERE t.tipo_processo = 'RETIRADA_SENHA' AND a.data_atendimento >= ?
    """, (inicio_tempo_real,))
    tempos = cur.fetchall()
    tempos_espera_real = []
    for row in tempos:
        if row["retirada"] and row["inicio_medico"]:
            dt_ret = datetime.fromisoformat(row["retirada"])
            dt_ini = datetime.fromisoformat(row["inicio_medico"])
            # Só conta se o INICIO_MEDICO foi nos últimos 60min
            if dt_ini >= inicio_tempo_real:
                tempo = (dt_ini - dt_ret).total_seconds() / 60
                if tempo > 0:
                    tempos_espera_real.append(tempo)
    tempoMedioEsperaTempoReal = int(sum(tempos_espera_real) / len(tempos_espera_real)) if tempos_espera_real else 0

    medicosPlantao = 3

    # Projeção (igual já faz)
    bucket_hist = Counter()
    cur = conn.execute("SELECT data_atendimento FROM atendimento")
    historico = cur.fetchall()
    if periodo in ['12h', '24h']:
        for row in historico:
            data_hist = datetime.fromisoformat(row['data_atendimento'])
            if data_hist.weekday() == now.weekday():
                for i in range(num_pontos):
                    bucket_start = (inicio + i*delta).time()
                    bucket_end = (inicio + (i+1)*delta).time()
                    if bucket_start <= data_hist.time() < bucket_end:
                        label = bucket_labels[i]
                        bucket_hist[label] += 1
                        break
        if bucket_hist:
            horario_pico = max(bucket_hist, key=bucket_hist.get)
            texto_pico = horario_pico
        else:
            texto_pico = ""
    elif periodo == 'semana':
        for row in historico:
            data_hist = datetime.fromisoformat(row['data_atendimento'])
            label = data_hist.strftime("%a")
            bucket_hist[label] += 1
        if bucket_hist:
            dia_pico = max(bucket_hist, key=bucket_hist.get)
            dia_pt = dias_semana_pt.get(dia_pico, dia_pico)
            texto_pico = dia_pt
        else:
            texto_pico = ""
    elif periodo == 'mes':
        # Projeta por semana (mais fiel)
        for row in historico:
            data_hist = datetime.fromisoformat(row['data_atendimento'])
            for i in range(num_pontos):
                bucket_start = inicio + i*delta
                bucket_end = bucket_start + delta
                if bucket_start <= data_hist < bucket_end:
                    label = f"{bucket_start.strftime('%d/%m')}-{(bucket_end - timedelta(days=1)).strftime('%d/%m')}"
                    bucket_hist[label] += 1
                    break
        if bucket_hist:
            semana_pico = max(bucket_hist, key=bucket_hist.get)
            texto_pico = semana_pico
        else:
            texto_pico = ""
    elif periodo in ['3m', '6m', 'ano']:
        for row in historico:
            data_hist = datetime.fromisoformat(row['data_atendimento'])
            label = meses_pt.get(data_hist.strftime("%b"), data_hist.strftime("%b"))
            bucket_hist[label] += 1
        if bucket_hist:
            mes_pico = max(bucket_hist, key=bucket_hist.get)
            texto_pico = mes_pico
        else:
            texto_pico = ""
    else:
        texto_pico = ""

    if bucket_hist:
        pico_valor = bucket_hist[max(bucket_hist, key=bucket_hist.get)]
        if pico_valor < 5:
            fluxo_esperado = "Baixo"
        elif pico_valor < 10:
            fluxo_esperado = "Moderado"
        else:
            fluxo_esperado = "Alto"
    else:
        fluxo_esperado = "--"

    data = {
        "informacoesGerais": {
            "pessoasAguardando": pessoasAguardando,
            "duracaoMediaConsulta": tempoMedioEsperaTempoReal,
            "medicosPlantao": medicosPlantao,
        },
        "cardPeriodo": {
            "titulo": f"Período selecionado",
            "totalAtendimentos": totalAtendimentos,
            "tempoMedioEspera": tempoMedioEsperaFiltro
        },
        "projecao": {
            "horarioPico": texto_pico,
            "fluxoEsperado": fluxo_esperado
        },
        "grafico": {
            "labels": bucket_labels,
            "atendimentos": atendimentosGrafico,
            "tempoMedio": tempoMedioGrafico,
        }
    }
    return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True)
