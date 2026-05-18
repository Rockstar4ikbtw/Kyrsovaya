using autosalon.Data;
using autosalon.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using autosalon.Data;
using autosalon.Models;

namespace autosalon.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public PaymentsController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var payments = await _db.Payments.ToListAsync();

            return Ok(payments);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var payment = await _db.Payments.FindAsync(id);

            if (payment == null)
                return NotFound();

            return Ok(payment);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Payment payment)
        {
            _db.Payments.Add(payment);

            await _db.SaveChangesAsync();

            return Ok(payment);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Payment updated)
        {
            var payment = await _db.Payments.FindAsync(id);

            if (payment == null)
                return NotFound();

            payment.Sum = updated.Sum;
            payment.DateTime = updated.DateTime;
            payment.SaleId = updated.SaleId;

            await _db.SaveChangesAsync();

            return Ok(payment);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var payment = await _db.Payments.FindAsync(id);

            if (payment == null)
                return NotFound();

            _db.Payments.Remove(payment);

            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}